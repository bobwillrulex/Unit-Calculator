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

export const dimensionAlgebra = {
  multiply(left: DimensionVector, right: DimensionVector): DimensionVector {
    const result: Partial<Record<BaseDimension, number>> = {};

    for (const baseDimension of BASE_DIMENSIONS) {
      const exponent = getExponent(left, baseDimension) + getExponent(right, baseDimension);
      if (exponent !== 0) {
        result[baseDimension] = exponent;
      }
    }

    return createDimensionVector(result);
  },

  divide(left: DimensionVector, right: DimensionVector): DimensionVector {
    const result: Partial<Record<BaseDimension, number>> = {};

    for (const baseDimension of BASE_DIMENSIONS) {
      const exponent = getExponent(left, baseDimension) - getExponent(right, baseDimension);
      if (exponent !== 0) {
        result[baseDimension] = exponent;
      }
    }

    return createDimensionVector(result);
  },

  pow(vector: DimensionVector, exponent: number): DimensionVector {
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
  },

  equals(left: DimensionVector, right: DimensionVector): boolean {
    for (const baseDimension of BASE_DIMENSIONS) {
      if (getExponent(left, baseDimension) !== getExponent(right, baseDimension)) {
        return false;
      }
    }

    return true;
  },
} as const;

export type UnitAlgebra = typeof dimensionAlgebra;

export interface LinearUnitConversion {
  readonly kind: 'linear';
  readonly toBaseFactor: number;
}

export interface AffineUnitConversion {
  readonly kind: 'affine';
  readonly toBaseFactor: number;
  readonly toBaseOffset: number;
}

export type UnitConversion = LinearUnitConversion | AffineUnitConversion;

export interface UnitDefinition {
  readonly id: string;
  readonly label: string;
  readonly symbol: string;
  readonly category: string;
  readonly dimension: DimensionVector;
  readonly conversion: UnitConversion;
}

export type UnitRegistry = ReadonlyArray<UnitDefinition>;

export interface Quantity {
  readonly valueInBaseUnits: number;
  readonly dimension: DimensionVector;
}

const createLinearUnit = (
  id: string,
  label: string,
  symbol: string,
  category: string,
  dimension: DimensionVector,
  toBaseFactor: number,
): UnitDefinition => ({
  id,
  label,
  symbol,
  category,
  dimension,
  conversion: {
    kind: 'linear',
    toBaseFactor,
  },
});

const createAffineUnit = (
  id: string,
  label: string,
  symbol: string,
  category: string,
  dimension: DimensionVector,
  toBaseFactor: number,
  toBaseOffset: number,
): UnitDefinition => ({
  id,
  label,
  symbol,
  category,
  dimension,
  conversion: {
    kind: 'affine',
    toBaseFactor,
    toBaseOffset,
  },
});

export const UNIT_DEFINITIONS = {
  // Length (base: meter)
  meter: createLinearUnit('meter', 'Meter', 'm', 'length', createDimensionVector({ L: 1 }), 1),
  centimeter: createLinearUnit(
    'centimeter',
    'Centimeter',
    'cm',
    'length',
    createDimensionVector({ L: 1 }),
    0.01,
  ),
  kilometer: createLinearUnit(
    'kilometer',
    'Kilometer',
    'km',
    'length',
    createDimensionVector({ L: 1 }),
    1000,
  ),

  // Volume (base: liter)
  liter: createLinearUnit('liter', 'Liter', 'L', 'volume', createDimensionVector({ V: 1 }), 1),
  milliliter: createLinearUnit(
    'milliliter',
    'Milliliter',
    'mL',
    'volume',
    createDimensionVector({ V: 1 }),
    0.001,
  ),

  // Time (base: second)
  second: createLinearUnit('second', 'Second', 's', 'time', createDimensionVector({ T: 1 }), 1),
  minute: createLinearUnit('minute', 'Minute', 'min', 'time', createDimensionVector({ T: 1 }), 60),
  hour: createLinearUnit('hour', 'Hour', 'hr', 'time', createDimensionVector({ T: 1 }), 3600),

  // Temperature (base: kelvin) - requires affine conversion
  celsius: createAffineUnit(
    'celsius',
    'Celsius',
    'C',
    'temperature',
    createDimensionVector({ Temp: 1 }),
    1,
    273.15,
  ),
  fahrenheit: createAffineUnit(
    'fahrenheit',
    'Fahrenheit',
    'F',
    'temperature',
    createDimensionVector({ Temp: 1 }),
    5 / 9,
    273.15 - 32 * (5 / 9),
  ),
  kelvin: createLinearUnit(
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
