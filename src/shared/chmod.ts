export interface PermissionTriad {
  read: boolean;
  write: boolean;
  execute: boolean;
}

export interface ChmodState {
  owner: PermissionTriad;
  group: PermissionTriad;
  other: PermissionTriad;
  setuid: boolean;
  setgid: boolean;
  sticky: boolean;
}

export interface ChmodSummary {
  octal3: string;
  octal4: string;
  symbolic: string;
  fileSymbolic: string;
  dirSymbolic: string;
  command: string;
  symbolicCommand: string;
  umaskFile: string;
  umaskDir: string;
}

export interface AclRule {
  scope: 'u' | 'g' | 'm' | 'o';
  name: string;
  read: boolean;
  write: boolean;
  execute: boolean;
}

export interface AclCommandOptions {
  path: string;
  recursive: boolean;
  defaultAcl: boolean;
  rules: readonly AclRule[];
}

export interface AclCommandResult {
  apply: string;
  inspect: string;
  removeAll: string;
}

function triadToSymbolic(t: PermissionTriad, smartX = false): string {
  const r = t.read ? 'r' : '';
  const w = t.write ? 'w' : '';
  const x = t.execute ? (smartX ? 'X' : 'x') : '';
  return `${r}${w}${x}`;
}

export function buildChmodCommands(
  state: ChmodState,
  options: { path?: string; recursive?: boolean; smartX?: boolean } = {},
): { octalCommand: string; symbolicCommand: string } {
  const path = options.path?.trim() || '<file>';
  const flag = options.recursive ? '-R ' : '';
  const special = (state.setuid ? 4 : 0) + (state.setgid ? 2 : 0) + (state.sticky ? 1 : 0);
  const o = triadToDigit(state.owner);
  const g = triadToDigit(state.group);
  const p = triadToDigit(state.other);
  const oct = special > 0 ? `${special}${o}${g}${p}` : `${o}${g}${p}`;

  const smartX = Boolean(options.smartX);
  const parts: string[] = [
    `u=${triadToSymbolic(state.owner, smartX)}`,
    `g=${triadToSymbolic(state.group, smartX)}`,
    `o=${triadToSymbolic(state.other, smartX)}`,
  ];
  if (state.setuid) parts.push('u+s');
  if (state.setgid) parts.push('g+s');
  if (state.sticky) parts.push('+t');

  return {
    octalCommand: `chmod ${flag}${oct} ${path}`,
    symbolicCommand: `chmod ${flag}${parts.join(',')} ${path}`,
  };
}

export function buildSetfaclCommands(options: AclCommandOptions): AclCommandResult {
  const path = options.path.trim() || '<path>';
  const flags = [options.recursive ? '-R' : '', options.defaultAcl ? '-d' : ''].filter(Boolean).join(' ');
  const flagPrefix = flags ? `${flags} ` : '';

  const specParts = options.rules.map((r) => {
    const perms = `${r.read ? 'r' : '-'}${r.write ? 'w' : '-'}${r.execute ? 'x' : '-'}`;
    if (r.scope === 'm' || r.scope === 'o') {
      return `${r.scope}::${perms}`;
    }
    return `${r.scope}:${r.name.trim()}:${perms}`;
  });

  const spec = specParts.length > 0 ? specParts.join(',') : 'u:alice:rw-';
  return {
    apply: `setfacl ${flagPrefix}-m ${spec} ${path}`,
    inspect: `getfacl ${path}`,
    removeAll: `setfacl ${options.recursive ? '-R ' : ''}-b ${path}`,
  };
}

function triadToDigit(t: PermissionTriad): number {
  return (t.read ? 4 : 0) + (t.write ? 2 : 0) + (t.execute ? 1 : 0);
}

function digitToTriad(d: number): PermissionTriad {
  return {
    read: Boolean(d & 4),
    write: Boolean(d & 2),
    execute: Boolean(d & 1),
  };
}

export function formatChmod(state: ChmodState): ChmodSummary {
  const special = (state.setuid ? 4 : 0) + (state.setgid ? 2 : 0) + (state.sticky ? 1 : 0);
  const o = triadToDigit(state.owner);
  const g = triadToDigit(state.group);
  const p = triadToDigit(state.other);

  const octal3 = `${o}${g}${p}`;
  const octal4 = `${special}${octal3}`;

  const ownerExec = state.setuid
    ? state.owner.execute
      ? 's'
      : 'S'
    : state.owner.execute
      ? 'x'
      : '-';
  const groupExec = state.setgid
    ? state.group.execute
      ? 's'
      : 'S'
    : state.group.execute
      ? 'x'
      : '-';
  const otherExec = state.sticky
    ? state.other.execute
      ? 't'
      : 'T'
    : state.other.execute
      ? 'x'
      : '-';

  const symbolic =
    (state.owner.read ? 'r' : '-') +
    (state.owner.write ? 'w' : '-') +
    ownerExec +
    (state.group.read ? 'r' : '-') +
    (state.group.write ? 'w' : '-') +
    groupExec +
    (state.other.read ? 'r' : '-') +
    (state.other.write ? 'w' : '-') +
    otherExec;

  // Umask needed to achieve this mode for files (666 - mode) and directories (777 - mode)
  const umaskFile = `0${(6 & ~o).toString(8)}${(6 & ~g).toString(8)}${(6 & ~p).toString(8)}`;
  const umaskDir = `0${(7 & ~o).toString(8)}${(7 & ~g).toString(8)}${(7 & ~p).toString(8)}`;

  const cmds = buildChmodCommands(state);

  return {
    octal3,
    octal4,
    symbolic,
    fileSymbolic: `-${symbolic}`,
    dirSymbolic: `d${symbolic}`,
    command: cmds.octalCommand,
    symbolicCommand: cmds.symbolicCommand,
    umaskFile,
    umaskDir,
  };
}

export function parseChmodOctal(raw: string): ChmodState | null {
  const trimmed = raw.trim();
  if (!/^[0-7]{3,4}$/.test(trimmed)) return null;
  const padded = trimmed.length === 3 ? `0${trimmed}` : trimmed;
  const special = Number(padded[0]);
  return {
    setuid: Boolean(special & 4),
    setgid: Boolean(special & 2),
    sticky: Boolean(special & 1),
    owner: digitToTriad(Number(padded[1])),
    group: digitToTriad(Number(padded[2])),
    other: digitToTriad(Number(padded[3])),
  };
}

export function parseChmodSymbolic(raw: string): ChmodState | null {
  let s = raw.trim();
  if (s.length === 10 && 'dcbpls-'.includes(s[0]!)) {
    s = s.slice(1);
  }
  if (s.length !== 9) return null;
  if (!/^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(s)) return null;

  return {
    owner: { read: s[0] === 'r', write: s[1] === 'w', execute: s[2] === 'x' || s[2] === 's' },
    group: { read: s[3] === 'r', write: s[4] === 'w', execute: s[5] === 'x' || s[5] === 's' },
    other: { read: s[6] === 'r', write: s[7] === 'w', execute: s[8] === 'x' || s[8] === 't' },
    setuid: s[2] === 's' || s[2] === 'S',
    setgid: s[5] === 's' || s[5] === 'S',
    sticky: s[8] === 't' || s[8] === 'T',
  };
}
