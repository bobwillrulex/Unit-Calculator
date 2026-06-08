"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parser = exports.parse = exports.tokenize = void 0;
const OPERATORS = new Set(['+', '-', '*', '/', '^']);
const isDigit = (char) => /\d/.test(char);
const isUnitStart = (char) => /[A-Za-z°µμ]/.test(char);
const isUnitChar = (char) => /[A-Za-z0-9_°µμ]/.test(char);
const tokenize = (input) => {
    var _a;
    const tokens = [];
    let index = 0;
    while (index < input.length) {
        const char = input[index];
        if (/\s/.test(char)) {
            index += 1;
            continue;
        }
        if (isDigit(char) || (char === '.' && isDigit((_a = input[index + 1]) !== null && _a !== void 0 ? _a : ''))) {
            const start = index;
            let sawDecimal = char === '.';
            index += 1;
            while (index < input.length) {
                const next = input[index];
                if (isDigit(next)) {
                    index += 1;
                }
                else if (next === '.' && !sawDecimal) {
                    sawDecimal = true;
                    index += 1;
                }
                else {
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
exports.tokenize = tokenize;
const peek = (state) => state.tokens[state.current];
const previous = (state) => state.tokens[state.current - 1];
const atEnd = (state) => peek(state).type === 'eof';
const check = (state, type) => !atEnd(state) && peek(state).type === type;
const advance = (state) => {
    if (!atEnd(state)) {
        state.current += 1;
    }
    return previous(state);
};
const matchType = (state, type) => {
    if (!check(state, type)) {
        return false;
    }
    advance(state);
    return true;
};
const matchOperator = (state, operator) => {
    if (!check(state, 'operator') || peek(state).lexeme !== operator) {
        return false;
    }
    advance(state);
    return true;
};
const parsePrimary = (state) => {
    var _a;
    if (matchType(state, 'number')) {
        return { kind: 'number', value: (_a = previous(state).value) !== null && _a !== void 0 ? _a : Number.NaN };
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
const parsePower = (state) => {
    const base = parsePrimary(state);
    if (!matchOperator(state, '^')) {
        return base;
    }
    return { kind: 'power-expression', base, exponent: parsePower(state) };
};
const implicitMultiplicationStarts = (token) => token.type === 'number' || token.type === 'unit' || token.type === 'lparen';
const parseImplicitMultiplicative = (state) => {
    let expression = parsePower(state);
    while (implicitMultiplicationStarts(peek(state))) {
        expression = {
            kind: 'binary-expression',
            operator: '*',
            left: expression,
            right: parsePower(state),
        };
    }
    return expression;
};
const parseMultiplicative = (state) => {
    let expression = parseImplicitMultiplicative(state);
    while (true) {
        if (matchOperator(state, '*') || matchOperator(state, '/')) {
            expression = {
                kind: 'binary-expression',
                operator: previous(state).lexeme,
                left: expression,
                right: parseImplicitMultiplicative(state),
            };
            continue;
        }
        return expression;
    }
};
const parseAdditive = (state) => {
    let expression = parseMultiplicative(state);
    while (matchOperator(state, '+') || matchOperator(state, '-')) {
        expression = {
            kind: 'binary-expression',
            operator: previous(state).lexeme,
            left: expression,
            right: parseMultiplicative(state),
        };
    }
    return expression;
};
const parse = (input) => {
    const tokens = (0, exports.tokenize)(input);
    const state = { tokens, current: 0 };
    const ast = parseAdditive(state);
    if (!atEnd(state)) {
        const token = peek(state);
        throw new Error(`Unexpected token "${token.lexeme}" at position ${token.position}.`);
    }
    return { raw: input, ast, tokens };
};
exports.parse = parse;
exports.parser = { parse: exports.parse };
