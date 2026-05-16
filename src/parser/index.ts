export type TokenType = 'number' | 'unit' | 'operator' | 'lparen' | 'rparen' | 'eof';
export type BinaryOperator = '+' | '-' | '*' | '/';

export type Token = {
  readonly type: TokenType;
  readonly lexeme: string;
  readonly position: number;
  readonly value?: number;
};

export type ExpressionNode =
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'unit'; readonly symbol: string }
  | { readonly kind: 'binary-expression'; readonly operator: BinaryOperator; readonly left: ExpressionNode; readonly right: ExpressionNode }
  | { readonly kind: 'power-expression'; readonly base: ExpressionNode; readonly exponent: ExpressionNode };

export type ParsedExpression = {
  readonly raw: string;
  readonly ast: ExpressionNode;
  readonly tokens: readonly Token[];
};

type ParseState = {
  readonly tokens: readonly Token[];
  current: number;
};

const OPERATORS = new Set(['+', '-', '*', '/', '^']);
const isDigit = (char: string): boolean => /\d/.test(char);
const isUnitStart = (char: string): boolean => /[A-Za-z°µμ]/.test(char);
const isUnitChar = (char: string): boolean => /[A-Za-z0-9_°µμ]/.test(char);

export const tokenize = (input: string): readonly Token[] => {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (isDigit(char) || (char === '.' && isDigit(input[index + 1] ?? ''))) {
      const start = index;
      let sawDecimal = char === '.';
      index += 1;

      while (index < input.length) {
        const next = input[index];
        if (isDigit(next)) {
          index += 1;
        } else if (next === '.' && !sawDecimal) {
          sawDecimal = true;
          index += 1;
        } else {
          break;
        }
      }

      const lexeme = input.slice(start, index);
      tokens.push({ type: 'number', lexeme, position: start, value: Number.parseFloat(lexeme) });
      continue;
    }

    if (isUnitStart(char)) {
      const start = index;
      index += 1;
      while (index < input.length && isUnitChar(input[index])) {
        index += 1;
      }
      tokens.push({ type: 'unit', lexeme: input.slice(start, index), position: start });
      continue;
    }

    if (OPERATORS.has(char)) {
      tokens.push({ type: 'operator', lexeme: char, position: index });
      index += 1;
      continue;
    }

    if (char === '(' || char === ')') {
      tokens.push({ type: char === '(' ? 'lparen' : 'rparen', lexeme: char, position: index });
      index += 1;
      continue;
    }

    throw new Error(`Unexpected character "${char}" at position ${index}.`);
  }

  tokens.push({ type: 'eof', lexeme: '', position: input.length });
  return tokens;
};

const peek = (state: ParseState): Token => state.tokens[state.current];
const previous = (state: ParseState): Token => state.tokens[state.current - 1];
const atEnd = (state: ParseState): boolean => peek(state).type === 'eof';
const check = (state: ParseState, type: TokenType): boolean => !atEnd(state) && peek(state).type === type;

const advance = (state: ParseState): Token => {
  if (!atEnd(state)) {
    state.current += 1;
  }
  return previous(state);
};

const matchType = (state: ParseState, type: TokenType): boolean => {
  if (!check(state, type)) {
    return false;
  }
  advance(state);
  return true;
};

const matchOperator = (state: ParseState, operator: string): boolean => {
  if (!check(state, 'operator') || peek(state).lexeme !== operator) {
    return false;
  }
  advance(state);
  return true;
};

const parsePrimary = (state: ParseState): ExpressionNode => {
  if (matchType(state, 'number')) {
    return { kind: 'number', value: previous(state).value ?? Number.NaN };
  }

  if (matchType(state, 'unit')) {
    return { kind: 'unit', symbol: previous(state).lexeme };
  }

  if (matchType(state, 'lparen')) {
    const expression = parseAdditive(state);
    if (!matchType(state, 'rparen')) {
      const token = peek(state);
      throw new Error(`Expected ")" after grouped expression. Found "${token.lexeme}" at position ${token.position}.`);
    }
    return expression;
  }

  throw new Error(`Expected expression at position ${peek(state).position}.`);
};

const parsePower = (state: ParseState): ExpressionNode => {
  const base = parsePrimary(state);
  if (!matchOperator(state, '^')) {
    return base;
  }
  return { kind: 'power-expression', base, exponent: parsePower(state) };
};

const implicitMultiplicationStarts = (token: Token): boolean =>
  token.type === 'number' || token.type === 'unit' || token.type === 'lparen';

const parseMultiplicative = (state: ParseState): ExpressionNode => {
  let expression = parsePower(state);

  while (true) {
    if (matchOperator(state, '*') || matchOperator(state, '/')) {
      expression = {
        kind: 'binary-expression',
        operator: previous(state).lexeme as BinaryOperator,
        left: expression,
        right: parsePower(state),
      };
      continue;
    }

    if (!implicitMultiplicationStarts(peek(state))) {
      return expression;
    }

    expression = {
      kind: 'binary-expression',
      operator: '*',
      left: expression,
      right: parsePower(state),
    };
  }
};

const parseAdditive = (state: ParseState): ExpressionNode => {
  let expression = parseMultiplicative(state);

  while (matchOperator(state, '+') || matchOperator(state, '-')) {
    expression = {
      kind: 'binary-expression',
      operator: previous(state).lexeme as BinaryOperator,
      left: expression,
      right: parseMultiplicative(state),
    };
  }

  return expression;
};

export const parse = (input: string): ParsedExpression => {
  const tokens = tokenize(input);
  const state: ParseState = { tokens, current: 0 };
  const ast = parseAdditive(state);

  if (!atEnd(state)) {
    const token = peek(state);
    throw new Error(`Unexpected token "${token.lexeme}" at position ${token.position}.`);
  }

  return { raw: input, ast, tokens };
};

export const parser = { parse };
