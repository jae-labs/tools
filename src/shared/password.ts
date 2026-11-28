export type PasswordType = 'random' | 'memorable' | 'pin';

export type MemorableSeparator = 'hyphen' | 'space' | 'period' | 'underscore' | 'none';

export interface RandomPasswordOptions {
  length: number;
  numbers: boolean;
  symbols: boolean;
}

export interface MemorablePasswordOptions {
  words: number;
  separator: MemorableSeparator;
  capitalize: boolean;
  includeNumber: boolean;
}

export interface PinPasswordOptions {
  length: number;
}

export interface PasswordGenerateOptions {
  type: PasswordType;
  random?: Partial<RandomPasswordOptions>;
  memorable?: Partial<MemorablePasswordOptions>;
  pin?: Partial<PinPasswordOptions>;
}

export type PasswordStrengthLabel = 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Very Strong';

export type PasswordCharKind = 'letter' | 'number' | 'symbol';

export interface PasswordToken {
  char: string;
  kind: PasswordCharKind;
}

export interface PasswordResult {
  password: string;
  type: PasswordType;
  length: number;
  entropyBits: number;
  strength: PasswordStrengthLabel;
  tokens: PasswordToken[];
}

export const DEFAULT_RANDOM_OPTIONS: RandomPasswordOptions = {
  length: 20,
  numbers: true,
  symbols: false,
};

export const DEFAULT_MEMORABLE_OPTIONS: MemorablePasswordOptions = {
  words: 4,
  separator: 'hyphen',
  capitalize: false,
  includeNumber: false,
};

export const DEFAULT_PIN_OPTIONS: PinPasswordOptions = {
  length: 6,
};

export const RANDOM_LENGTH_MIN = 8;
export const RANDOM_LENGTH_MAX = 100;
export const MEMORABLE_WORDS_MIN = 3;
export const MEMORABLE_WORDS_MAX = 15;
export const PIN_LENGTH_MIN = 3;
export const PIN_LENGTH_MAX = 16;

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LETTERS = LOWERCASE + UPPERCASE;
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';

const SEPARATOR_MAP: Record<MemorableSeparator, string> = {
  hyphen: '-',
  space: ' ',
  period: '.',
  underscore: '_',
  none: '',
};

// Curated EFF-style list of 384 distinct, memorable, easy-to-type English words (~8.58 bits/word)
export const MEMORABLE_WORDLIST: readonly string[] = [
  'acorn', 'admire', 'agate', 'alder', 'alibi', 'alpine', 'amber', 'anchor',
  'anvil', 'apron', 'arbor', 'arctic', 'arena', 'arrow', 'aspen', 'atlas',
  'attic', 'audio', 'autumn', 'avocado', 'badge', 'bagel', 'baker', 'bamboo',
  'banjo', 'banyan', 'barley', 'barrel', 'basil', 'basket', 'beacon', 'beaker',
  'beaver', 'belfry', 'berry', 'bison', 'bliss', 'blossom', 'bobcat', 'bonfire',
  'bonsai', 'border', 'boulder', 'bounty', 'branch', 'breeze', 'bridge', 'brisk',
  'bronze', 'brook', 'bucket', 'buffalo', 'bundle', 'bunker', 'burlap', 'butter',
  'cabin', 'cactus', 'cairn', 'camel', 'camera', 'camp', 'canal', 'canary',
  'candle', 'cannon', 'canoe', 'canopy', 'canyon', 'caper', 'caravan', 'carbon',
  'cargo', 'carpet', 'carrot', 'carve', 'castle', 'cedar', 'cellar', 'chalk',
  'chapel', 'charm', 'cherry', 'chime', 'cider', 'cinder', 'cinema', 'cipher',
  'citadel', 'citrus', 'civic', 'clasp', 'clever', 'cliff', 'climate', 'clover',
  'cobalt', 'cobble', 'cocoa', 'comet', 'compass', 'condor', 'copper', 'coral',
  'cornet', 'cosmos', 'cotton', 'cougar', 'cradle', 'crane', 'crater', 'crayon',
  'creek', 'crest', 'cricket', 'crimson', 'crocus', 'crown', 'cruise', 'crystal',
  'cupola', 'curio', 'current', 'cursor', 'cushion', 'cyclone', 'cypress', 'dagger',
  'dahlia', 'daisy', 'dancer', 'dapple', 'dawn', 'delta', 'denim', 'desert',
  'diadem', 'diode', 'dolphin', 'domino', 'donkey', 'dorsal', 'dragon', 'drift',
  'drizzle', 'drum', 'dune', 'dynamo', 'eagle', 'earth', 'ebony', 'echo',
  'eclipse', 'eddy', 'elder', 'elixir', 'elm', 'ember', 'emerald', 'empire',
  'enamel', 'encore', 'engine', 'enigma', 'epoch', 'equinox', 'ermine', 'estuary',
  'fable', 'fabric', 'falcon', 'fathom', 'feather', 'fennel', 'fern', 'ferry',
  'festive', 'fiber', 'fiddle', 'field', 'fig', 'filter', 'finch', 'fjord',
  'flannel', 'flint', 'flora', 'flute', 'focus', 'folio', 'forest', 'forge',
  'fossil', 'fountain', 'fox', 'framed', 'fresco', 'frost', 'fusion', 'galaxy',
  'galley', 'garden', 'garnet', 'garth', 'gazelle', 'gecko', 'geyser', 'ginger',
  'glacier', 'glade', 'glider', 'glimmer', 'globe', 'goblet', 'gopher', 'granite',
  'gravel', 'griffin', 'grotto', 'grove', 'guitar', 'gusto', 'harbor', 'harvest',
  'haven', 'hawk', 'hazel', 'hearth', 'heather', 'helium', 'herald', 'heron',
  'hickory', 'horizon', 'hornet', 'humble', 'ibex', 'icicle', 'igloo', 'indigo',
  'ingot', 'inlet', 'iris', 'island', 'ivory', 'jackal', 'jade', 'jaguar',
  'jasper', 'jigsaw', 'jockey', 'juniper', 'kayak', 'kelp', 'kennel', 'kernel',
  'kestrel', 'kettle', 'kindle', 'kingdom', 'kiwi', 'koala', 'lagoon', 'lantern',
  'larch', 'lariat', 'lark', 'laser', 'lattice', 'laurel', 'lava', 'legend',
  'lemon', 'lemur', 'lentil', 'leopard', 'lichen', 'lilac', 'linden', 'linnet',
  'lizard', 'llama', 'lobster', 'locket', 'locust', 'lodge', 'lotus', 'lumber',
  'lunar', 'lynx', 'lyric', 'magnet', 'magpie', 'mallet', 'mammal', 'mango',
  'mantis', 'maple', 'marble', 'margin', 'marina', 'marmot', 'marsh', 'marten',
  'mascot', 'matrix', 'meadow', 'medley', 'melon', 'mercury', 'merlin', 'mesa',
  'meteor', 'mica', 'mimosa', 'minnow', 'mint', 'mirage', 'mitten', 'mocha',
  'monarch', 'monsoon', 'moose', 'mortar', 'mosaic', 'moss', 'muffin', 'mulberry',
  'mustang', 'myrtle', 'narwhal', 'nebula', 'nectar', 'needle', 'neon', 'nettle',
  'newt', 'nickel', 'nimbus', 'nomad', 'noodle', 'north', 'novice', 'nutmeg',
  'oasis', 'oatmeal', 'obelisk', 'ocean', 'ocelot', 'ochre', 'octave', 'olive',
  'omega', 'onyx', 'opal', 'oracle', 'orange', 'orbit', 'orchard', 'orchid',
  'oriole', 'osprey', 'otter', 'outpost', 'owl', 'oyster', 'paddle', 'pagoda',
  'palace', 'pallet', 'palomino', 'panda', 'panther', 'papaya', 'paper', 'parade',
  'parcel', 'parlor', 'parrot', 'parsley', 'pastel', 'patio', 'pebble', 'pecan',
  'pelican', 'pencil', 'penguin', 'peony', 'pepper', 'perch', 'pewter', 'phoenix',
];

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Unbiased cryptographically secure random integer in [0, max).
 */
export function secureRandomInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0) {
    throw new RangeError(`max must be a positive integer, got ${max}`);
  }
  if (max === 1) return 0;

  const range = 0x1_0000_0000;
  const limit = range - (range % max);
  const buf = new Uint32Array(1);
  let value: number;
  do {
    globalThis.crypto.getRandomValues(buf);
    value = buf[0]!;
  } while (value >= limit);

  return value % max;
}

function pickChar(charset: string): string {
  return charset[secureRandomInt(charset.length)]!;
}

function shuffleArray<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

export function classifyPasswordChar(ch: string): PasswordCharKind {
  if (ch >= '0' && ch <= '9') return 'number';
  if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) return 'letter';
  return 'symbol';
}

export function tokenizePassword(password: string): PasswordToken[] {
  return Array.from(password).map((char) => ({
    char,
    kind: classifyPasswordChar(char),
  }));
}

export function classifyStrength(entropyBits: number): PasswordStrengthLabel {
  if (entropyBits < 36) return 'Weak';
  if (entropyBits < 56) return 'Fair';
  if (entropyBits < 76) return 'Good';
  if (entropyBits < 100) return 'Strong';
  return 'Very Strong';
}

export function generateRandomPassword(partial?: Partial<RandomPasswordOptions>): PasswordResult {
  const length = clampInt(
    partial?.length ?? DEFAULT_RANDOM_OPTIONS.length,
    RANDOM_LENGTH_MIN,
    RANDOM_LENGTH_MAX,
    DEFAULT_RANDOM_OPTIONS.length,
  );
  const numbers = partial?.numbers ?? DEFAULT_RANDOM_OPTIONS.numbers;
  const symbols = partial?.symbols ?? DEFAULT_RANDOM_OPTIONS.symbols;

  let pool = LETTERS;
  const required: string[] = [pickChar(LOWERCASE), pickChar(UPPERCASE)];

  if (numbers) {
    pool += DIGITS;
    required.push(pickChar(DIGITS));
  }
  if (symbols) {
    pool += SYMBOLS;
    required.push(pickChar(SYMBOLS));
  }

  const chars: string[] = [...required];
  while (chars.length < length) {
    chars.push(pickChar(pool));
  }
  shuffleArray(chars);

  const password = chars.slice(0, length).join('');
  const entropyBits = Math.round(length * Math.log2(pool.length) * 10) / 10;

  return {
    password,
    type: 'random',
    length: password.length,
    entropyBits,
    strength: classifyStrength(entropyBits),
    tokens: tokenizePassword(password),
  };
}

export function generateMemorablePassword(partial?: Partial<MemorablePasswordOptions>): PasswordResult {
  const wordsCount = clampInt(
    partial?.words ?? DEFAULT_MEMORABLE_OPTIONS.words,
    MEMORABLE_WORDS_MIN,
    MEMORABLE_WORDS_MAX,
    DEFAULT_MEMORABLE_OPTIONS.words,
  );
  const separatorKey: MemorableSeparator =
    partial?.separator && partial.separator in SEPARATOR_MAP
      ? partial.separator
      : DEFAULT_MEMORABLE_OPTIONS.separator;
  const capitalize = partial?.capitalize ?? DEFAULT_MEMORABLE_OPTIONS.capitalize;
  const includeNumber = partial?.includeNumber ?? DEFAULT_MEMORABLE_OPTIONS.includeNumber;

  const chosen: string[] = [];
  for (let i = 0; i < wordsCount; i++) {
    let word = MEMORABLE_WORDLIST[secureRandomInt(MEMORABLE_WORDLIST.length)]!;
    if (capitalize) {
      word = word[0]!.toUpperCase() + word.slice(1);
    }
    chosen.push(word);
  }

  if (includeNumber) {
    const targetIdx = secureRandomInt(chosen.length);
    const digit = secureRandomInt(10);
    chosen[targetIdx] = `${chosen[targetIdx]}${digit}`;
  }

  const sep = SEPARATOR_MAP[separatorKey];
  const password = chosen.join(sep);

  let entropy = wordsCount * Math.log2(MEMORABLE_WORDLIST.length);
  if (includeNumber) {
    entropy += Math.log2(10 * wordsCount);
  }
  const entropyBits = Math.round(entropy * 10) / 10;

  return {
    password,
    type: 'memorable',
    length: password.length,
    entropyBits,
    strength: classifyStrength(entropyBits),
    tokens: tokenizePassword(password),
  };
}

export function generatePinPassword(partial?: Partial<PinPasswordOptions>): PasswordResult {
  const length = clampInt(
    partial?.length ?? DEFAULT_PIN_OPTIONS.length,
    PIN_LENGTH_MIN,
    PIN_LENGTH_MAX,
    DEFAULT_PIN_OPTIONS.length,
  );

  const chars: string[] = [];
  for (let i = 0; i < length; i++) {
    chars.push(pickChar(DIGITS));
  }

  const password = chars.join('');
  const entropyBits = Math.round(length * Math.log2(10) * 10) / 10;

  return {
    password,
    type: 'pin',
    length: password.length,
    entropyBits,
    strength: classifyStrength(entropyBits),
    tokens: tokenizePassword(password),
  };
}

export function generatePassword(options: PasswordGenerateOptions): PasswordResult {
  switch (options.type) {
    case 'memorable':
      return generateMemorablePassword(options.memorable);
    case 'pin':
      return generatePinPassword(options.pin);
    case 'random':
    default:
      return generateRandomPassword(options.random);
  }
}
