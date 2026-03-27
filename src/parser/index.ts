export interface ParsedExpression {
  readonly raw: string;
}

export interface ExpressionParser {
  parse(input: string): ParsedExpression;
}
