export type TokenType =
  | 'number'
  | 'unit'
  | 'operator'
  | 'lparen'
  | 'rparen'
  | 'eof';

export interface Token {
  readonly type: TokenType;
  readonly lexeme: string;
  readonly position: number;
  readonly value?: number;
  readonly operator?: BinaryOperator;
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

const OPERATORS: ReadonlySet<string> = new Set(['+', '-', '*', '/', '^']);

const isWhitespace = (char: string): boolean => /\s/.test(char);
const isDigit = (char: string): boolean => /\d/.test(char);
const isUnitStart = (char: string): boolean => /[A-Za-zµμ]/.test(char);
const isUnitChar = (char: string): boolean => /[A-Za-z0-9_µμ]/.test(char);

export class DefaultTokenizer implements Tokenizer {
  tokenize(input: string): ReadonlyArray<Token> {
    const tokens: Array<Token> = [];
    let index = 0;

    while (index < input.length) {
      const char = input[index];

      if (isWhitespace(char)) {
        index += 1;
        continue;
      }

      if (isDigit(char) || (char === '.' && isDigit(input[index + 1] ?? ''))) {
        const start = index;
        let seenDecimalPoint = char === '.';
        index += 1;

        while (index < input.length) {
          const current = input[index];

          if (isDigit(current)) {
            index += 1;
            continue;
          }

          if (current === '.' && !seenDecimalPoint) {
            seenDecimalPoint = true;
            index += 1;
            continue;
          }

          break;
        }

        const lexeme = input.slice(start, index);
        tokens.push({
          type: 'number',
          lexeme,
          position: start,
          value: Number.parseFloat(lexeme),
        });
        continue;
      }

      if (isUnitStart(char)) {
        const start = index;
        index += 1;

        while (index < input.length && isUnitChar(input[index])) {
          index += 1;
        }

        tokens.push({
          type: 'unit',
          lexeme: input.slice(start, index),
          position: start,
        });
        continue;
      }

      if (OPERATORS.has(char)) {
        tokens.push({
          type: 'operator',
          lexeme: char,
          position: index,
          operator: char as BinaryOperator,
        });
        index += 1;
        continue;
      }

      if (char === '(') {
        tokens.push({
          type: 'lparen',
          lexeme: char,
          position: index,
        });
        index += 1;
        continue;
      }

      if (char === ')') {
        tokens.push({
          type: 'rparen',
          lexeme: char,
          position: index,
        });
        index += 1;
        continue;
      }

      throw new Error(`Unexpected character "${char}" at position ${index}.`);
    }

    tokens.push({
      type: 'eof',
      lexeme: '',
      position: input.length,
    });

    return tokens;
  }
}

export const tokenizer: Tokenizer = new DefaultTokenizer();
