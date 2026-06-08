"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateExpression = void 0;
const units_1 = require("../units");
const findUnit = (symbol, units) => units.find((unit) => unit.symbol === symbol || unit.id === symbol);
const applyAdd = (left, right, operator) => {
    if (!(0, units_1.areDimensionsEqual)(left.dimension, right.dimension)) {
        throw new Error(`Dimension mismatch for "${operator}" operation.`);
    }
    return {
        value: operator === '+' ? left.value + right.value : left.value - right.value,
        dimension: left.dimension,
    };
};
const applyMultiply = (left, right, operator) => {
    if (operator === '/' && right.value === 0) {
        throw new Error('Cannot divide by zero.');
    }
    return {
        value: operator === '*' ? left.value * right.value : left.value / right.value,
        dimension: operator === '*'
            ? (0, units_1.multiplyDimensions)(left.dimension, right.dimension)
            : (0, units_1.divideDimensions)(left.dimension, right.dimension),
    };
};
const evaluateBinary = (operator, left, right) => operator === '+' || operator === '-'
    ? applyAdd(left, right, operator)
    : applyMultiply(left, right, operator);
const evaluateNode = (node, units) => {
    if (node.kind === 'number') {
        return { value: node.value, dimension: units_1.DIMENSIONLESS };
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
    if (!(0, units_1.areDimensionsEqual)(exponent.dimension, units_1.DIMENSIONLESS)) {
        throw new Error('Exponent must be dimensionless.');
    }
    return {
        value: Math.pow(base.value, exponent.value),
        dimension: (0, units_1.powDimensions)(base.dimension, exponent.value),
    };
};
const evaluateExpression = (parsedExpression, units) => evaluateNode(parsedExpression.ast, units);
exports.evaluateExpression = evaluateExpression;
