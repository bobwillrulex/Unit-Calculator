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

export interface UnitDefinition {
  readonly id: string;
  readonly label: string;
  readonly symbol: string;
  readonly category: string;
  readonly dimension: DimensionVector;
  readonly toBaseScale: number;
}

export type UnitRegistry = ReadonlyArray<UnitDefinition>;

export interface Quantity {
  readonly valueInBaseUnits: number;
  readonly dimension: DimensionVector;
}
