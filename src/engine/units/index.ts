export interface DimensionVector {
  readonly length: number;
  readonly mass: number;
  readonly time: number;
  readonly electricCurrent: number;
  readonly thermodynamicTemperature: number;
  readonly amountOfSubstance: number;
  readonly luminousIntensity: number;
}

export const DIMENSIONLESS: DimensionVector = {
  length: 0,
  mass: 0,
  time: 0,
  electricCurrent: 0,
  thermodynamicTemperature: 0,
  amountOfSubstance: 0,
  luminousIntensity: 0,
};

export interface UnitDefinition {
  readonly id: string;
  readonly label: string;
  readonly symbol: string;
  readonly category: string;
  readonly dimension: DimensionVector;
  readonly toBaseScale: number;
}

export type UnitRegistry = ReadonlyArray<UnitDefinition>;

export interface UnitAlgebra {
  multiply(left: DimensionVector, right: DimensionVector): DimensionVector;
  divide(left: DimensionVector, right: DimensionVector): DimensionVector;
  pow(vector: DimensionVector, exponent: number): DimensionVector;
  equals(left: DimensionVector, right: DimensionVector): boolean;
}

export interface Quantity {
  readonly valueInBaseUnits: number;
  readonly dimension: DimensionVector;
}
