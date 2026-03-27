import type { BinaryExpression, ExpressionNode, ParsedExpression, PowerExpression } from '../../parser';
import {
  DIMENSIONLESS,
  areDimensionsEqual,
  divideDimensions,
  multiplyDimensions,
  powDimensions,
  type DimensionVector,
  type UnitDefinition,
  type UnitRegistry,
} from '../units';

export interface EvaluationContext {
  readonly units: UnitRegistry;
}

export interface EvaluationResult {
  readonly value: number;
  readonly dimension: DimensionVector;
}

export interface ExpressionEvaluator {
  evaluate(parsedExpression: ParsedExpression, context: EvaluationContext): EvaluationResult;
}

const findUnit = (symbol: string, units: UnitRegistry): UnitDefinition | undefined =>
  units.find((unit) => unit.symbol === symbol || unit.id === symbol);

const evaluateNumberNode = (value: number): EvaluationResult => ({
  value,
  dimension: DIMENSIONLESS,
});

const evaluateUnitNode = (symbol: string, units: UnitRegistry): EvaluationResult => {
  const unit = findUnit(symbol, units);

  if (!unit) {
    throw new Error(`Unknown unit: ${symbol}`);
  }

  if (unit.conversion.kind !== 'linear') {
    throw new Error(`Affine units are not supported in expression evaluation: ${unit.symbol}`);
  }

  return {
    value: unit.conversion.toBaseFactor,
    dimension: unit.dimension,
  };
};

const evaluateAdditiveOperation = (
  left: EvaluationResult,
  right: EvaluationResult,
  operator: '+' | '-',
): EvaluationResult => {
  if (!areDimensionsEqual(left.dimension, right.dimension)) {
    throw new Error(`Dimension mismatch for "${operator}" operation.`);
  }

  return {
    value: operator === '+' ? left.value + right.value : left.value - right.value,
    dimension: left.dimension,
  };
};

const evaluateMultiplicativeOperation = (
  left: EvaluationResult,
  right: EvaluationResult,
  operator: '*' | '/',
): EvaluationResult => {
  if (operator === '/' && right.value === 0) {
    throw new Error('Cannot divide by zero.');
  }

  return {
    value: operator === '*' ? left.value * right.value : left.value / right.value,
    dimension:
      operator === '*'
        ? multiplyDimensions(left.dimension, right.dimension)
        : divideDimensions(left.dimension, right.dimension),
  };
};

const evaluateBinaryExpression = (
  node: BinaryExpression,
  units: UnitRegistry,
): EvaluationResult => {
  const left = evaluateNode(node.left, units);
  const right = evaluateNode(node.right, units);

  if (node.operator === '+' || node.operator === '-') {
    return evaluateAdditiveOperation(left, right, node.operator);
  }

  return evaluateMultiplicativeOperation(left, right, node.operator);
};

const evaluatePowerExpression = (node: PowerExpression, units: UnitRegistry): EvaluationResult => {
  const base = evaluateNode(node.base, units);
  const exponent = evaluateNode(node.exponent, units);

  if (!areDimensionsEqual(exponent.dimension, DIMENSIONLESS)) {
    throw new Error('Exponent must be dimensionless.');
  }

  return {
    value: Math.pow(base.value, exponent.value),
    dimension: powDimensions(base.dimension, exponent.value),
  };
};

const evaluateNode = (node: ExpressionNode, units: UnitRegistry): EvaluationResult => {
  switch (node.kind) {
    case 'number':
      return evaluateNumberNode(node.value);
    case 'unit':
      return evaluateUnitNode(node.symbol, units);
    case 'binary-expression':
      return evaluateBinaryExpression(node, units);
    case 'power-expression':
      return evaluatePowerExpression(node, units);
    default:
      throw new Error('Unsupported expression node kind.');
  }
};

export const createExpressionEvaluator = (): ExpressionEvaluator => ({
  evaluate(parsedExpression: ParsedExpression, context: EvaluationContext): EvaluationResult {
    return evaluateNode(parsedExpression.ast, context.units);
  },
});

export const expressionEvaluator: ExpressionEvaluator = createExpressionEvaluator();
