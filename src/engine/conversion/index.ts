import type { ParsedExpression } from '../../parser';
import {
  DEFAULT_UNIT_REGISTRY,
  DIMENSIONLESS,
  areDimensionsEqual,
  convertValueFromBaseUnits,
  convertValueToBaseUnits,
  createDimensionVector,
  multiplyDimensions,
  powDimensions,
  type DimensionVector,
  type UnitDefinition,
  type UnitRegistry,
} from '../units';

type UnitExpression = {
  readonly dimension: DimensionVector;
  readonly toBase: (value: number) => number;
  readonly fromBase: (value: number) => number;
};

const getUnit = (token: string, units: UnitRegistry): UnitDefinition => {
  const normalized = token.trim();
  const unit = units.find((item) => item.symbol === normalized || item.id === normalized);

  if (!unit) {
    throw new Error(`Unknown unit: ${token}`);
  }

  return unit;
};

const parseUnitFactor = (token: string): { readonly unitToken: string; readonly exponent: number } => {
  const [unitToken, exponentToken] = token.trim().split('^');
  const exponent = exponentToken === undefined ? 1 : Number(exponentToken);

  if (!unitToken || !Number.isInteger(exponent)) {
    throw new Error(`Invalid unit factor: ${token}`);
  }

  return { unitToken, exponent };
};

const tokenizeUnitExpression = (expression: string): readonly string[] => {
  const tokens = expression.replace(/\s+/g, '').split(/([*/])/).filter(Boolean);
  const hasBadEdges = tokens[0] === '*' || tokens[0] === '/' || tokens.at(-1) === '*' || tokens.at(-1) === '/';

  if (tokens.length === 0 || hasBadEdges) {
    throw new Error(`Invalid unit expression: ${expression}`);
  }

  return tokens;
};

const singleUnitExpression = (unit: UnitDefinition, exponent: number): UnitExpression => {
  if (exponent !== 1) {
    if (unit.conversion.kind !== 'linear') {
      throw new Error(`Cannot exponentiate affine unit: ${unit.symbol}`);
    }

    const factor = Math.pow(unit.conversion.toBaseFactor, exponent);
    return {
      dimension: powDimensions(unit.dimension, exponent),
      toBase: (value) => value * factor,
      fromBase: (value) => value / factor,
    };
  }

  return {
    dimension: unit.dimension,
    toBase: (value) => convertValueToBaseUnits(value, unit),
    fromBase: (value) => convertValueFromBaseUnits(value, unit),
  };
};

const parseUnitExpression = (expression: string, units: UnitRegistry): UnitExpression => {
  const tokens = tokenizeUnitExpression(expression);

  if (tokens.length === 1) {
    const { unitToken, exponent } = parseUnitFactor(tokens[0]);
    return singleUnitExpression(getUnit(unitToken, units), exponent);
  }

  let dimension = DIMENSIONLESS;
  let factor = 1;
  let operator: '*' | '/' = '*';

  for (const token of tokens) {
    if (token === '*' || token === '/') {
      operator = token;
      continue;
    }

    const { unitToken, exponent } = parseUnitFactor(token);
    const unit = getUnit(unitToken, units);

    if (unit.conversion.kind !== 'linear') {
      throw new Error(`Affine units are not supported in compound unit expressions: ${unit.symbol}`);
    }

    const signedExponent = operator === '/' ? -exponent : exponent;
    dimension = multiplyDimensions(dimension, powDimensions(unit.dimension, signedExponent));
    factor *= Math.pow(unit.conversion.toBaseFactor, signedExponent);
  }

  return {
    dimension: createDimensionVector(dimension),
    toBase: (value) => value * factor,
    fromBase: (value) => value / factor,
  };
};

export const convert = (
  value: number,
  fromUnit: string,
  toUnit: string,
  units: UnitRegistry = DEFAULT_UNIT_REGISTRY,
): number => {
  const from = parseUnitExpression(fromUnit, units);
  const to = parseUnitExpression(toUnit, units);

  if (!areDimensionsEqual(from.dimension, to.dimension)) {
    throw new Error(`Incompatible units: ${fromUnit} cannot be converted to ${toUnit}`);
  }

  return to.fromBase(from.toBase(value));
};

export const getDefaultDisplayUnitForExpression = (
  parsedExpression: ParsedExpression,
  units: UnitRegistry = DEFAULT_UNIT_REGISTRY,
): UnitDefinition | undefined => {
  const firstUnitToken = parsedExpression.tokens.find((token) => token.type === 'unit');
  return firstUnitToken ? getUnit(firstUnitToken.lexeme, units) : undefined;
};
