import type { ParsedExpression } from '../../parser';
import {
  DEFAULT_UNIT_REGISTRY,
  DIMENSIONLESS,
  areDimensionsEqual,
  createDimensionVector,
  multiplyDimensions,
  powDimensions,
  type DimensionVector,
  type Quantity,
  type Unit,
  type UnitDefinition,
  type UnitRegistry,
} from '../units';

export interface CalculatedResult {
  readonly baseValue: number;
  readonly dimension: DimensionVector;
  readonly displayUnit: Unit;
}

export interface ConversionRequest {
  readonly quantityInBaseUnits: Quantity;
  readonly to: UnitDefinition;
}

export interface ConversionResult {
  readonly value: number;
  readonly unitSymbol: string;
}

export interface ConversionEngine {
  convert(request: ConversionRequest): ConversionResult;
}

const convertBaseValueToDisplay = (baseValue: number, unit: Unit): number => {
  const conversion = unit.conversion;

  if (conversion.kind === 'linear') {
    return baseValue / conversion.toBaseFactor;
  }

  return (baseValue - conversion.toBaseOffset) / conversion.toBaseFactor;
};

export const createCalculatedResult = (
  baseQuantity: Quantity,
  displayUnit: Unit,
): CalculatedResult => {
  if (!areDimensionsEqual(baseQuantity.dimension, displayUnit.dimension)) {
    throw new Error(`Incompatible dimensions for display unit ${displayUnit.symbol}`);
  }

  return {
    baseValue: baseQuantity.valueInBaseUnits,
    dimension: baseQuantity.dimension,
    displayUnit,
  };
};

export const getDisplayValue = (result: CalculatedResult): number =>
  convertBaseValueToDisplay(result.baseValue, result.displayUnit);

export const switchDisplayUnit = (
  result: CalculatedResult,
  nextDisplayUnit: Unit,
): CalculatedResult => {
  if (!areDimensionsEqual(result.dimension, nextDisplayUnit.dimension)) {
    throw new Error(`Incompatible dimensions for display unit ${nextDisplayUnit.symbol}`);
  }

  return {
    ...result,
    displayUnit: nextDisplayUnit,
  };
};

interface ParsedUnitExpression {
  readonly dimension: DimensionVector;
  readonly toBase: (value: number) => number;
  readonly fromBase: (value: number) => number;
}

const normalizeUnitToken = (token: string): string => token.trim();

const getUnitByToken = (token: string, units: UnitRegistry): UnitDefinition => {
  const normalizedToken = normalizeUnitToken(token);

  const bySymbol = units.find((unit) => unit.symbol === normalizedToken);
  if (bySymbol) {
    return bySymbol;
  }

  const byId = units.find((unit) => unit.id === normalizedToken);
  if (byId) {
    return byId;
  }

  throw new Error(`Unknown unit: ${token}`);
};

const parseUnitFactor = (token: string): { readonly unitToken: string; readonly exponent: number } => {
  const trimmedToken = normalizeUnitToken(token);
  const exponentSeparatorIndex = trimmedToken.indexOf('^');

  if (exponentSeparatorIndex === -1) {
    return {
      unitToken: trimmedToken,
      exponent: 1,
    };
  }

  const unitToken = trimmedToken.slice(0, exponentSeparatorIndex).trim();
  const exponentToken = trimmedToken.slice(exponentSeparatorIndex + 1).trim();

  if (unitToken.length === 0 || exponentToken.length === 0) {
    throw new Error(`Invalid unit factor: ${token}`);
  }

  const exponent = Number(exponentToken);
  if (!Number.isInteger(exponent)) {
    throw new Error(`Unit exponents must be integers. Received: ${exponentToken}`);
  }

  return {
    unitToken,
    exponent,
  };
};

const tokenizeUnitExpression = (unitExpression: string): ReadonlyArray<string> => {
  const compactExpression = unitExpression.replace(/\s+/g, '');
  if (compactExpression.length === 0) {
    throw new Error('Unit expression cannot be empty.');
  }

  const tokens = compactExpression.split(/([*/])/).filter((token) => token.length > 0);

  const startsWithOperator = tokens[0] === '*' || tokens[0] === '/';
  const endsWithOperator = tokens[tokens.length - 1] === '*' || tokens[tokens.length - 1] === '/';

  if (startsWithOperator || endsWithOperator) {
    throw new Error(`Invalid unit expression: ${unitExpression}`);
  }

  return tokens;
};

const parseUnitExpression = (unitExpression: string, units: UnitRegistry): ParsedUnitExpression => {
  const tokens = tokenizeUnitExpression(unitExpression);

  if (tokens.length === 1) {
    const { unitToken, exponent } = parseUnitFactor(tokens[0]);
    const unit = getUnitByToken(unitToken, units);

    if (exponent !== 1) {
      if (unit.conversion.kind !== 'linear') {
        throw new Error(`Cannot exponentiate affine unit: ${unit.symbol}`);
      }

      const scaledDimension = powDimensions(unit.dimension, exponent);
      const factor = Math.pow(unit.conversion.toBaseFactor, exponent);

      return {
        dimension: scaledDimension,
        toBase: (value: number): number => value * factor,
        fromBase: (value: number): number => value / factor,
      };
    }

    if (unit.conversion.kind === 'affine') {
      const conversion = unit.conversion;

      return {
        dimension: unit.dimension,
        toBase: (value: number): number => value * conversion.toBaseFactor + conversion.toBaseOffset,
        fromBase: (value: number): number =>
          (value - conversion.toBaseOffset) / conversion.toBaseFactor,
      };
    }

    return {
      dimension: unit.dimension,
      toBase: (value: number): number => value * unit.conversion.toBaseFactor,
      fromBase: (value: number): number => value / unit.conversion.toBaseFactor,
    };
  }

  let totalDimension = DIMENSIONLESS;
  let totalFactor = 1;
  let currentOperator: '*' | '/' = '*';

  for (const token of tokens) {
    if (token === '*' || token === '/') {
      currentOperator = token;
      continue;
    }

    const { unitToken, exponent } = parseUnitFactor(token);
    const unit = getUnitByToken(unitToken, units);

    if (unit.conversion.kind !== 'linear') {
      throw new Error(`Affine units are not supported in compound unit expressions: ${unit.symbol}`);
    }

    const signedExponent = currentOperator === '/' ? -exponent : exponent;
    const poweredDimension = powDimensions(unit.dimension, signedExponent);
    totalDimension = multiplyDimensions(totalDimension, poweredDimension);

    totalFactor *= Math.pow(unit.conversion.toBaseFactor, signedExponent);
  }

  return {
    dimension: createDimensionVector(totalDimension),
    toBase: (value: number): number => value * totalFactor,
    fromBase: (value: number): number => value / totalFactor,
  };
};

export const convert = (
  value: number,
  fromUnit: string,
  toUnit: string,
  units: UnitRegistry = DEFAULT_UNIT_REGISTRY,
): number => {
  const fromExpression = parseUnitExpression(fromUnit, units);
  const toExpression = parseUnitExpression(toUnit, units);

  if (!areDimensionsEqual(fromExpression.dimension, toExpression.dimension)) {
    throw new Error(`Incompatible units: ${fromUnit} cannot be converted to ${toUnit}`);
  }

  const valueInBaseUnits = fromExpression.toBase(value);
  return toExpression.fromBase(valueInBaseUnits);
};

export const getDefaultDisplayUnitForExpression = (
  parsedExpression: ParsedExpression,
  units: UnitRegistry = DEFAULT_UNIT_REGISTRY,
): UnitDefinition | undefined => {
  const firstUnitToken = parsedExpression.tokens.find((token) => token.type === 'unit');

  if (!firstUnitToken) {
    return undefined;
  }

  return getUnitByToken(firstUnitToken.lexeme, units);
};

export const createConversionEngine = (): ConversionEngine => ({
  convert(request: ConversionRequest): ConversionResult {
    if (!areDimensionsEqual(request.quantityInBaseUnits.dimension, request.to.dimension)) {
      throw new Error(
        `Incompatible dimensions for conversion to ${request.to.symbol}`,
      );
    }

    return {
      value: convertBaseValueToDisplay(request.quantityInBaseUnits.valueInBaseUnits, request.to),
      unitSymbol: request.to.symbol,
    };
  },
});
