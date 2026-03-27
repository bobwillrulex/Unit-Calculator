export type TokenType =
  | 'number'
  | 'identifier'
  | 'operator'
  | 'lparen'
  | 'rparen'
  | 'eof';

export interface Token {
  readonly type: TokenType;
  readonly lexeme: string;
  readonly position: number;
}

export interface Tokenizer {
  tokenize(input: string): ReadonlyArray<Token>;
}

export type BinaryOperator = '+' | '-' | '*' | '/' | '^';

export type ExpressionNode =
  | NumberNode
  | UnitSymbolNode
  | UnaryNode
  | BinaryNode
  | GroupNode;

export interface NumberNode {
  readonly kind: 'number';
  readonly value: number;
}

export interface UnitSymbolNode {
  readonly kind: 'unit-symbol';
  readonly symbol: string;
}

export interface UnaryNode {
  readonly kind: 'unary';
  readonly operator: '+' | '-';
  readonly operand: ExpressionNode;
}

export interface BinaryNode {
  readonly kind: 'binary';
  readonly operator: BinaryOperator;
  readonly left: ExpressionNode;
  readonly right: ExpressionNode;
}

export interface GroupNode {
  readonly kind: 'group';
  readonly expression: ExpressionNode;
}

export interface ParsedExpression {
  readonly raw: string;
  readonly ast: ExpressionNode;
  readonly tokens: ReadonlyArray<Token>;
}

export interface ExpressionParser {
  parse(input: string): ParsedExpression;
}
