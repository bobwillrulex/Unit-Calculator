import type { BinaryOperator, ExpressionNode, ParsedExpression } from '../../parser';
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

export type EvaluationResult = {
  readonly value: number;
  readonly dimension: DimensionVector;
};

const findUnit = (symbol: string, units: UnitRegistry): UnitDefinition | undefined =>
  units.find((unit) => unit.symbol === symbol || unit.id === symbol);

const applyAdd = (left: EvaluationResult, right: EvaluationResult, operator: '+' | '-'): EvaluationResult => {
  if (!areDimensionsEqual(left.dimension, right.dimension)) {
    throw new Error(`Dimension mismatch for "${operator}" operation.`);
  }

  return {
    value: operator === '+' ? left.value + right.value : left.value - right.value,
    dimension: left.dimension,
  };
};

const applyMultiply = (left: EvaluationResult, right: EvaluationResult, operator: '*' | '/'): EvaluationResult => {
  if (operator === '/' && right.value === 0) {
    throw new Error('Cannot divide by zero.');
  }

  return {
    value: operator === '*' ? left.value * right.value : left.value / right.value,
    dimension: operator === '*'
      ? multiplyDimensions(left.dimension, right.dimension)
      : divideDimensions(left.dimension, right.dimension),
  };
};

const evaluateBinary = (operator: BinaryOperator, left: EvaluationResult, right: EvaluationResult): EvaluationResult =>
  operator === '+' || operator === '-'
    ? applyAdd(left, right, operator)
    : applyMultiply(left, right, operator);

const evaluateNode = (node: ExpressionNode, units: UnitRegistry): EvaluationResult => {
  if (node.kind === 'number') {
    return { value: node.value, dimension: DIMENSIONLESS };
  }

  if (node.kind === 'unit') {
    const unit = findUnit(node.symbol, units);
    if (!unit) {
      throw new Error(`Unknown unit: ${node.symbol}`);
    }
    return { value: unit.conversion.toBaseFactor, dimension: unit.dimension };
  }

  if (node.kind === 'binary-expression') {
    return evaluateBinary(node.operator, evaluateNode(node.left, units), evaluateNode(node.right, units));
  }

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

export const evaluateExpression = (parsedExpression: ParsedExpression, units: UnitRegistry): EvaluationResult =>
  evaluateNode(parsedExpression.ast, units);
