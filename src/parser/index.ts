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
  readonly operator?: BinaryOperator | '^';
}

export interface Tokenizer {
  tokenize(input: string): ReadonlyArray<Token>;
}

export type BinaryOperator = '+' | '-' | '*' | '/';

export type ExpressionNode =
  | NumberNode
  | UnitNode
  | BinaryExpression
  | PowerExpression;

export interface NumberNode {
  readonly kind: 'number';
  readonly value: number;
}

export interface UnitNode {
  readonly kind: 'unit';
  readonly symbol: string;
}

export interface BinaryExpression {
  readonly kind: 'binary-expression';
  readonly operator: BinaryOperator;
  readonly left: ExpressionNode;
  readonly right: ExpressionNode;
}

export interface PowerExpression {
  readonly kind: 'power-expression';
  readonly base: ExpressionNode;
  readonly exponent: ExpressionNode;
  readonly exponentType: ExponentType;
}

export type ExponentType = 'number' | 'unit' | 'expression';

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
          operator: char as '^' | BinaryOperator,
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

class DefaultExpressionParser implements ExpressionParser {
  parse(input: string): ParsedExpression {
    const tokens = tokenizer.tokenize(input);
    const state = { tokens, current: 0 };
    const ast = this.parseAdditive(state);

    if (!this.isAtEnd(state)) {
      const token = this.peek(state);
      throw new Error(`Unexpected token "${token.lexeme}" at position ${token.position}.`);
    }

    return { raw: input, ast, tokens };
  }

  private parseAdditive(state: ParseState): ExpressionNode {
    let expression = this.parseMultiplicative(state);

    while (
      this.matchOperator(state, '+') ||
      this.matchOperator(state, '-')
    ) {
      const operator = this.previous(state).lexeme as BinaryOperator;
      const right = this.parseMultiplicative(state);
      expression = {
        kind: 'binary-expression',
        operator,
        left: expression,
        right,
      };
    }

    return expression;
  }

  private parseMultiplicative(state: ParseState): ExpressionNode {
    let expression = this.parsePower(state);

    while (true) {
      if (this.matchOperator(state, '*') || this.matchOperator(state, '/')) {
        const operator = this.previous(state).lexeme as BinaryOperator;
        const right = this.parsePower(state);
        expression = {
          kind: 'binary-expression',
          operator,
          left: expression,
          right,
        };
        continue;
      }

      if (this.isImplicitMultiplicationStart(this.peek(state))) {
        const right = this.parsePower(state);
        expression = {
          kind: 'binary-expression',
          operator: '*',
          left: expression,
          right,
        };
        continue;
      }

      break;
    }

    return expression;
  }

  private parsePower(state: ParseState): ExpressionNode {
    const base = this.parsePrimary(state);

    if (!this.matchOperator(state, '^')) {
      return base;
    }

    const exponent = this.parsePower(state);
    return {
      kind: 'power-expression',
      base,
      exponent,
      exponentType: this.getExponentType(base),
    };
  }

  private parsePrimary(state: ParseState): ExpressionNode {
    if (this.matchType(state, 'number')) {
      const token = this.previous(state);
      return {
        kind: 'number',
        value: token.value ?? Number.NaN,
      };
    }

    if (this.matchType(state, 'unit')) {
      const token = this.previous(state);
      return {
        kind: 'unit',
        symbol: token.lexeme,
      };
    }

    if (this.matchType(state, 'lparen')) {
      const expression = this.parseAdditive(state);
      this.consumeType(state, 'rparen', 'Expected ")" after grouped expression.');
      return expression;
    }

    const token = this.peek(state);
    throw new Error(`Expected expression at position ${token.position}.`);
  }

  private getExponentType(base: ExpressionNode): ExponentType {
    if (base.kind === 'number') {
      return 'number';
    }

    if (base.kind === 'unit') {
      return 'unit';
    }

    return 'expression';
  }

  private matchOperator(state: ParseState, operator: string): boolean {
    if (!this.check(state, 'operator')) {
      return false;
    }

    if (this.peek(state).lexeme !== operator) {
      return false;
    }

    this.advance(state);
    return true;
  }

  private matchType(state: ParseState, type: TokenType): boolean {
    if (!this.check(state, type)) {
      return false;
    }

    this.advance(state);
    return true;
  }

  private consumeType(state: ParseState, type: TokenType, message: string): Token {
    if (this.check(state, type)) {
      return this.advance(state);
    }

    const token = this.peek(state);
    throw new Error(`${message} Found "${token.lexeme}" at position ${token.position}.`);
  }

  private isImplicitMultiplicationStart(token: Token): boolean {
    return token.type === 'number' || token.type === 'unit' || token.type === 'lparen';
  }

  private check(state: ParseState, type: TokenType): boolean {
    if (this.isAtEnd(state)) {
      return false;
    }

    return this.peek(state).type === type;
  }

  private advance(state: ParseState): Token {
    if (!this.isAtEnd(state)) {
      state.current += 1;
    }

    return this.previous(state);
  }

  private isAtEnd(state: ParseState): boolean {
    return this.peek(state).type === 'eof';
  }

  private peek(state: ParseState): Token {
    return state.tokens[state.current];
  }

  private previous(state: ParseState): Token {
    return state.tokens[state.current - 1];
  }
}

interface ParseState {
  readonly tokens: ReadonlyArray<Token>;
  current: number;
}

export const tokenizer: Tokenizer = new DefaultTokenizer();
export const parser: ExpressionParser = new DefaultExpressionParser();
