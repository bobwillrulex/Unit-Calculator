import type { ParsedExpression } from '../../parser';
import type { Quantity, UnitRegistry } from '../units';

export interface EvaluationContext {
  readonly units: UnitRegistry;
}

export interface ExpressionEvaluator {
  evaluate(parsedExpression: ParsedExpression, context: EvaluationContext): Quantity;
}
