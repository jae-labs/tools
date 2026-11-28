export interface XmlToJsonOptions {
  attributePrefix?: string;
  parsePrimitives?: boolean;
  trimText?: boolean;
  indent?: number;
}

export interface XmlToJsonResult {
  json: unknown;
  formatted: string;
  stats: {
    elements: number;
    attributes: number;
    inputBytes: number;
    outputBytes: number;
  };
}

interface XmlElementNode {
  tag: string;
  attrs: Record<string, unknown>;
  children: XmlElementNode[];
  texts: string[];
}

function decodeXmlEntities(raw: string): string {
  return raw
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replaceAll('&amp;', '&');
}

function coercePrimitive(raw: string): unknown {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw)) {
    const num = Number(raw);
    if (Number.isSafeInteger(num) || (!Number.isInteger(num) && Number.isFinite(num))) {
      return num;
    }
  }
  return raw;
}

function parseAttributes(
  attrSource: string,
  prefix: string,
  parsePrimitives: boolean,
  counter: { attributes: number },
): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  const attrRegex = /([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const match of attrSource.matchAll(attrRegex)) {
    const key = `${prefix}${match[1]}`;
    const decoded = decodeXmlEntities(match[2] ?? match[3] ?? '');
    attrs[key] = parsePrimitives ? coercePrimitive(decoded) : decoded;
    counter.attributes += 1;
  }
  return attrs;
}

function nodeToJsonValue(
  node: XmlElementNode,
  opts: Required<Omit<XmlToJsonOptions, 'indent'>>,
): unknown {
  const joinedText = opts.trimText ? node.texts.join('').trim() : node.texts.join('');
  const hasAttrs = Object.keys(node.attrs).length > 0;
  const hasChildren = node.children.length > 0;

  if (!hasAttrs && !hasChildren) {
    if (!joinedText) return null;
    return opts.parsePrimitives ? coercePrimitive(joinedText) : joinedText;
  }

  const obj: Record<string, unknown> = { ...node.attrs };

  for (const child of node.children) {
    const converted = nodeToJsonValue(child, opts);
    if (Object.prototype.hasOwnProperty.call(obj, child.tag)) {
      const existing = obj[child.tag];
      if (Array.isArray(existing)) {
        existing.push(converted);
      } else {
        obj[child.tag] = [existing, converted];
      }
    } else {
      obj[child.tag] = converted;
    }
  }

  if (joinedText) {
    obj['#text'] = opts.parsePrimitives ? coercePrimitive(joinedText) : joinedText;
  }

  return obj;
}

export function convertXmlToJson(rawXml: string, options: XmlToJsonOptions = {}): XmlToJsonResult {
  const trimmedInput = rawXml.trim();
  if (!trimmedInput) {
    throw new Error('Paste XML input to convert to JSON.');
  }

  const opts: Required<Omit<XmlToJsonOptions, 'indent'>> = {
    attributePrefix: options.attributePrefix ?? '@',
    parsePrimitives: options.parsePrimitives ?? false,
    trimText: options.trimText ?? true,
  };

  const stack: XmlElementNode[] = [];
  const roots: XmlElementNode[] = [];
  const stats = { elements: 0, attributes: 0 };

  let cursor = 0;
  const len = trimmedInput.length;

  while (cursor < len) {
    const lt = trimmedInput.indexOf('<', cursor);
    if (lt === -1) {
      const trailing = trimmedInput.slice(cursor);
      if (stack.length > 0) {
        stack[stack.length - 1]!.texts.push(decodeXmlEntities(trailing));
      } else if (trailing.trim()) {
        throw new Error('Unexpected text outside XML root element.');
      }
      break;
    }

    if (lt > cursor) {
      const textSegment = trimmedInput.slice(cursor, lt);
      if (stack.length > 0) {
        stack[stack.length - 1]!.texts.push(decodeXmlEntities(textSegment));
      } else if (textSegment.trim()) {
        throw new Error('Unexpected text outside XML root element.');
      }
    }

    if (trimmedInput.startsWith('<!--', lt)) {
      const endComment = trimmedInput.indexOf('-->', lt + 4);
      if (endComment === -1) throw new Error('Unclosed XML comment.');
      cursor = endComment + 3;
      continue;
    }

    if (trimmedInput.startsWith('<![CDATA[', lt)) {
      const endCdata = trimmedInput.indexOf(']]>', lt + 9);
      if (endCdata === -1) throw new Error('Unclosed CDATA section.');
      const cdataContent = trimmedInput.slice(lt + 9, endCdata);
      if (stack.length === 0) throw new Error('CDATA section outside root element.');
      stack[stack.length - 1]!.texts.push(cdataContent);
      cursor = endCdata + 3;
      continue;
    }

    if (trimmedInput.startsWith('<?', lt)) {
      const endPi = trimmedInput.indexOf('?>', lt + 2);
      if (endPi === -1) throw new Error('Unclosed XML processing instruction.');
      cursor = endPi + 2;
      continue;
    }

    if (trimmedInput.startsWith('<!', lt)) {
      const endDecl = trimmedInput.indexOf('>', lt + 2);
      if (endDecl === -1) throw new Error('Unclosed XML declaration.');
      cursor = endDecl + 1;
      continue;
    }

    const gt = trimmedInput.indexOf('>', lt + 1);
    if (gt === -1) {
      throw new Error('Malformed XML: missing closing ">".');
    }

    const inside = trimmedInput.slice(lt + 1, gt).trim();
    cursor = gt + 1;

    if (inside.startsWith('/')) {
      const closeTag = inside.slice(1).trim();
      const openNode = stack.pop();
      if (!openNode || openNode.tag !== closeTag) {
        throw new Error(
          `Mismatched closing tag </${closeTag}>${openNode ? ` (expected </${openNode.tag}>)` : ''}.`,
        );
      }
      if (stack.length === 0) {
        roots.push(openNode);
      } else {
        stack[stack.length - 1]!.children.push(openNode);
      }
      continue;
    }

    const selfClosing = inside.endsWith('/');
    const tagBody = selfClosing ? inside.slice(0, -1).trim() : inside;
    const spaceIdx = tagBody.search(/\s/);
    const tag = spaceIdx === -1 ? tagBody : tagBody.slice(0, spaceIdx);
    const attrPart = spaceIdx === -1 ? '' : tagBody.slice(spaceIdx + 1);

    if (!/^[A-Za-z_][\w:.-]*$/.test(tag)) {
      throw new Error(`Invalid XML element name: "${tag}".`);
    }

    stats.elements += 1;
    const node: XmlElementNode = {
      tag,
      attrs: attrPart ? parseAttributes(attrPart, opts.attributePrefix, opts.parsePrimitives, stats) : {},
      children: [],
      texts: [],
    };

    if (selfClosing) {
      if (stack.length === 0) {
        roots.push(node);
      } else {
        stack[stack.length - 1]!.children.push(node);
      }
    } else {
      stack.push(node);
    }
  }

  if (stack.length > 0) {
    throw new Error(`Unclosed XML tag <${stack[stack.length - 1]!.tag}>.`);
  }
  if (roots.length === 0) {
    throw new Error('No XML root element found.');
  }

  const rootObj: Record<string, unknown> = {};
  for (const root of roots) {
    const val = nodeToJsonValue(root, opts);
    if (Object.prototype.hasOwnProperty.call(rootObj, root.tag)) {
      const existing = rootObj[root.tag];
      if (Array.isArray(existing)) existing.push(val);
      else rootObj[root.tag] = [existing, val];
    } else {
      rootObj[root.tag] = val;
    }
  }

  const indent = options.indent === 0 ? undefined : Math.max(0, Math.min(8, options.indent ?? 2));
  const formatted = JSON.stringify(rootObj, null, indent);
  const encoder = new TextEncoder();

  return {
    json: rootObj,
    formatted,
    stats: {
      elements: stats.elements,
      attributes: stats.attributes,
      inputBytes: encoder.encode(rawXml).length,
      outputBytes: encoder.encode(formatted).length,
    },
  };
}
