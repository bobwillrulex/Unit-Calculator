export const BASE_DIMENSIONS = ['L', 'V', 'T', 'Temp'] as const;

export type BaseDimension = (typeof BASE_DIMENSIONS)[number];

export type DimensionVector = Readonly<Partial<Record<BaseDimension, number>>>;

const normalizeDimensionEntry = (value: number): number => {
  if (!Number.isFinite(value)) {
    throw new Error('Dimension exponents must be finite numbers.');
  }

  return Object.is(value, -0) ? 0 : value;
};

export const createDimensionVector = (
  entries: Partial<Record<BaseDimension, number>> = {},
): DimensionVector => {
  const vector: Partial<Record<BaseDimension, number>> = {};

  for (const baseDimension of BASE_DIMENSIONS) {
    const exponent = entries[baseDimension];

    if (typeof exponent !== 'number') {
      continue;
    }

    const normalizedExponent = normalizeDimensionEntry(exponent);
    if (normalizedExponent !== 0) {
      vector[baseDimension] = normalizedExponent;
    }
  }

  return vector;
};

export const DIMENSIONLESS: DimensionVector = createDimensionVector();

const getExponent = (vector: DimensionVector, baseDimension: BaseDimension): number =>
  typeof vector[baseDimension] === 'number' ? vector[baseDimension] : 0;

export const multiplyDimensions = (
  left: DimensionVector,
  right: DimensionVector,
): DimensionVector => {
  const result: Partial<Record<BaseDimension, number>> = {};

  for (const baseDimension of BASE_DIMENSIONS) {
    const exponent = getExponent(left, baseDimension) + getExponent(right, baseDimension);
    if (exponent !== 0) {
      result[baseDimension] = exponent;
    }
  }

  return createDimensionVector(result);
};

export const divideDimensions = (
  left: DimensionVector,
  right: DimensionVector,
): DimensionVector => {
  const result: Partial<Record<BaseDimension, number>> = {};

  for (const baseDimension of BASE_DIMENSIONS) {
    const exponent = getExponent(left, baseDimension) - getExponent(right, baseDimension);
    if (exponent !== 0) {
      result[baseDimension] = exponent;
    }
  }

  return createDimensionVector(result);
};

export const powDimensions = (vector: DimensionVector, exponent: number): DimensionVector => {
  const normalizedExponent = normalizeDimensionEntry(exponent);

  if (normalizedExponent === 0) {
    return DIMENSIONLESS;
  }

  const result: Partial<Record<BaseDimension, number>> = {};

  for (const baseDimension of BASE_DIMENSIONS) {
    const poweredExponent = getExponent(vector, baseDimension) * normalizedExponent;
    if (poweredExponent !== 0) {
      result[baseDimension] = poweredExponent;
    }
  }

  return createDimensionVector(result);
};

export const areDimensionsEqual = (
  left: DimensionVector,
  right: DimensionVector,
): boolean => {
  for (const baseDimension of BASE_DIMENSIONS) {
    if (getExponent(left, baseDimension) !== getExponent(right, baseDimension)) {
      return false;
    }
  }

  return true;
};

export type LinearUnitConversion = {
  readonly kind: 'linear';
  readonly toBaseFactor: number;
};

export type AffineUnitConversion = {
  readonly kind: 'affine';
  readonly toBaseFactor: number;
  readonly toBaseOffset: number;
};

export type UnitConversion = LinearUnitConversion | AffineUnitConversion;

export type UnitDefinition = {
  readonly id: string;
  readonly label: string;
  readonly symbol: string;
  readonly category: string;
  readonly dimension: DimensionVector;
  readonly conversion: UnitConversion;
};

export type UnitRegistry = ReadonlyArray<UnitDefinition>;

const unit = (
  id: string,
  label: string,
  symbol: string,
  category: string,
  dimension: DimensionVector,
  toBaseFactor: number,
  toBaseOffset?: number,
): UnitDefinition => ({
  id,
  label,
  symbol,
  category,
  dimension,
  conversion: toBaseOffset === undefined
    ? { kind: 'linear', toBaseFactor }
    : { kind: 'affine', toBaseFactor, toBaseOffset },
});

export const UNIT_DEFINITIONS = {
  // Length (base: meter)
  meter: unit('meter', 'Meter', 'm', 'length', createDimensionVector({ L: 1 }), 1),
  millimeter: unit(
    'millimeter',
    'Millimeter',
    'mm',
    'length',
    createDimensionVector({ L: 1 }),
    0.001,
  ),
  centimeter: unit(
    'centimeter',
    'Centimeter',
    'cm',
    'length',
    createDimensionVector({ L: 1 }),
    0.01,
  ),
  kilometer: unit(
    'kilometer',
    'Kilometer',
    'km',
    'length',
    createDimensionVector({ L: 1 }),
    1000,
  ),
  inch: unit('inch', 'Inch', 'in', 'length', createDimensionVector({ L: 1 }), 0.0254),
  foot: unit('foot', 'Foot', 'ft', 'length', createDimensionVector({ L: 1 }), 0.3048),
  yard: unit('yard', 'Yard', 'yd', 'length', createDimensionVector({ L: 1 }), 0.9144),
  mile: unit('mile', 'Mile', 'mi', 'length', createDimensionVector({ L: 1 }), 1609.344),

  // Volume (base: liter)
  liter: unit('liter', 'Liter', 'L', 'volume', createDimensionVector({ V: 1 }), 1),
  milliliter: unit(
    'milliliter',
    'Milliliter',
    'mL',
    'volume',
    createDimensionVector({ V: 1 }),
    0.001,
  ),

  // Time (base: second)
  second: unit('second', 'Second', 's', 'time', createDimensionVector({ T: 1 }), 1),
  millisecond: unit(
    'millisecond',
    'Millisecond',
    'ms',
    'time',
    createDimensionVector({ T: 1 }),
    0.001,
  ),
  minute: unit('minute', 'Minute', 'min', 'time', createDimensionVector({ T: 1 }), 60),
  hour: unit('hour', 'Hour', 'hr', 'time', createDimensionVector({ T: 1 }), 3600),
  hourShort: unit('hour-short', 'Hour', 'h', 'time', createDimensionVector({ T: 1 }), 3600),
  day: unit('day', 'Day', 'day', 'time', createDimensionVector({ T: 1 }), 86400),

  // Temperature (base: kelvin) - requires affine conversion
  celsius: unit(
    'celsius',
    'Celsius',
    'C',
    'temperature',
    createDimensionVector({ Temp: 1 }),
    1,
    273.15,
  ),
  fahrenheit: unit(
    'fahrenheit',
    'Fahrenheit',
    'F',
    'temperature',
    createDimensionVector({ Temp: 1 }),
    5 / 9,
    273.15 - 32 * (5 / 9),
  ),
  kelvin: unit(
    'kelvin',
    'Kelvin',
    'K',
    'temperature',
    createDimensionVector({ Temp: 1 }),
    1,
  ),
} as const;

export const DEFAULT_UNIT_REGISTRY: UnitRegistry = Object.values(UNIT_DEFINITIONS);

export const convertValueToBaseUnits = (value: number, unit: UnitDefinition): number => {
  if (unit.conversion.kind === 'affine') {
    return value * unit.conversion.toBaseFactor + unit.conversion.toBaseOffset;
  }

  return value * unit.conversion.toBaseFactor;
};

export const convertValueFromBaseUnits = (baseValue: number, unit: UnitDefinition): number => {
  if (unit.conversion.kind === 'affine') {
    return (baseValue - unit.conversion.toBaseOffset) / unit.conversion.toBaseFactor;
  }

  return baseValue / unit.conversion.toBaseFactor;
};
