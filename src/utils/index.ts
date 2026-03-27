export const isNonEmptyString = (value: string): boolean => value.trim().length > 0;

const SUPERSCRIPT_CHARACTERS: Readonly<Record<string, string>> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
  '+': '⁺',
};

const toSuperscript = (value: string): string =>
  value
    .split('')
    .map((character) => SUPERSCRIPT_CHARACTERS[character] ?? character)
    .join('');

export const formatUnitWithSuperscripts = (unitExpression: string): string =>
  unitExpression.replace(/\^([+-]?\d+)/g, (_, exponent: string) => toSuperscript(exponent));
