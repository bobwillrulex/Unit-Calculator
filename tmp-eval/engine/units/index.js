"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertValueFromBaseUnits = exports.convertValueToBaseUnits = exports.DEFAULT_UNIT_REGISTRY = exports.UNIT_DEFINITIONS = exports.areDimensionsEqual = exports.powDimensions = exports.divideDimensions = exports.multiplyDimensions = exports.DIMENSIONLESS = exports.createDimensionVector = exports.BASE_DIMENSIONS = void 0;
exports.BASE_DIMENSIONS = ['L', 'V', 'T', 'Temp'];
const normalizeDimensionEntry = (value) => {
    if (!Number.isFinite(value)) {
        throw new Error('Dimension exponents must be finite numbers.');
    }
    return Object.is(value, -0) ? 0 : value;
};
const createDimensionVector = (entries = {}) => {
    const vector = {};
    for (const baseDimension of exports.BASE_DIMENSIONS) {
        const exponent = entries[baseDimension];
        if (typeof exponent !== 'number') {
            continue;
        }
        const normalizedExponent = normalizeDimensionEntry(exponent);
        if (normalizedExponent !== 0) {
            vector[baseDimension] = normalizedExponent;
        }
    }
    return vector;
};
exports.createDimensionVector = createDimensionVector;
exports.DIMENSIONLESS = (0, exports.createDimensionVector)();
const getExponent = (vector, baseDimension) => typeof vector[baseDimension] === 'number' ? vector[baseDimension] : 0;
const multiplyDimensions = (left, right) => {
    const result = {};
    for (const baseDimension of exports.BASE_DIMENSIONS) {
        const exponent = getExponent(left, baseDimension) + getExponent(right, baseDimension);
        if (exponent !== 0) {
            result[baseDimension] = exponent;
        }
    }
    return (0, exports.createDimensionVector)(result);
};
exports.multiplyDimensions = multiplyDimensions;
const divideDimensions = (left, right) => {
    const result = {};
    for (const baseDimension of exports.BASE_DIMENSIONS) {
        const exponent = getExponent(left, baseDimension) - getExponent(right, baseDimension);
        if (exponent !== 0) {
            result[baseDimension] = exponent;
        }
    }
    return (0, exports.createDimensionVector)(result);
};
exports.divideDimensions = divideDimensions;
const powDimensions = (vector, exponent) => {
    const normalizedExponent = normalizeDimensionEntry(exponent);
    if (normalizedExponent === 0) {
        return exports.DIMENSIONLESS;
    }
    const result = {};
    for (const baseDimension of exports.BASE_DIMENSIONS) {
        const poweredExponent = getExponent(vector, baseDimension) * normalizedExponent;
        if (poweredExponent !== 0) {
            result[baseDimension] = poweredExponent;
        }
    }
    return (0, exports.createDimensionVector)(result);
};
exports.powDimensions = powDimensions;
const areDimensionsEqual = (left, right) => {
    for (const baseDimension of exports.BASE_DIMENSIONS) {
        if (getExponent(left, baseDimension) !== getExponent(right, baseDimension)) {
            return false;
        }
    }
    return true;
};
exports.areDimensionsEqual = areDimensionsEqual;
const unit = (id, label, symbol, category, dimension, toBaseFactor, toBaseOffset) => ({
    id,
    label,
    symbol,
    category,
    dimension,
    conversion: toBaseOffset === undefined
        ? { kind: 'linear', toBaseFactor }
        : { kind: 'affine', toBaseFactor, toBaseOffset },
});
exports.UNIT_DEFINITIONS = {
    // Length (base: meter)
    meter: unit('meter', 'Meter', 'm', 'length', (0, exports.createDimensionVector)({ L: 1 }), 1),
    millimeter: unit('millimeter', 'Millimeter', 'mm', 'length', (0, exports.createDimensionVector)({ L: 1 }), 0.001),
    centimeter: unit('centimeter', 'Centimeter', 'cm', 'length', (0, exports.createDimensionVector)({ L: 1 }), 0.01),
    kilometer: unit('kilometer', 'Kilometer', 'km', 'length', (0, exports.createDimensionVector)({ L: 1 }), 1000),
    inch: unit('inch', 'Inch', 'in', 'length', (0, exports.createDimensionVector)({ L: 1 }), 0.0254),
    foot: unit('foot', 'Foot', 'ft', 'length', (0, exports.createDimensionVector)({ L: 1 }), 0.3048),
    yard: unit('yard', 'Yard', 'yd', 'length', (0, exports.createDimensionVector)({ L: 1 }), 0.9144),
    mile: unit('mile', 'Mile', 'mi', 'length', (0, exports.createDimensionVector)({ L: 1 }), 1609.344),
    // Volume (base: liter)
    liter: unit('liter', 'Liter', 'L', 'volume', (0, exports.createDimensionVector)({ V: 1 }), 1),
    milliliter: unit('milliliter', 'Milliliter', 'mL', 'volume', (0, exports.createDimensionVector)({ V: 1 }), 0.001),
    // Time (base: second)
    second: unit('second', 'Second', 's', 'time', (0, exports.createDimensionVector)({ T: 1 }), 1),
    millisecond: unit('millisecond', 'Millisecond', 'ms', 'time', (0, exports.createDimensionVector)({ T: 1 }), 0.001),
    minute: unit('minute', 'Minute', 'min', 'time', (0, exports.createDimensionVector)({ T: 1 }), 60),
    hour: unit('hour', 'Hour', 'hr', 'time', (0, exports.createDimensionVector)({ T: 1 }), 3600),
    hourShort: unit('hour-short', 'Hour', 'h', 'time', (0, exports.createDimensionVector)({ T: 1 }), 3600),
    day: unit('day', 'Day', 'day', 'time', (0, exports.createDimensionVector)({ T: 1 }), 86400),
    // Temperature (base: kelvin) - requires affine conversion
    celsius: unit('celsius', 'Celsius', 'C', 'temperature', (0, exports.createDimensionVector)({ Temp: 1 }), 1, 273.15),
    fahrenheit: unit('fahrenheit', 'Fahrenheit', 'F', 'temperature', (0, exports.createDimensionVector)({ Temp: 1 }), 5 / 9, 273.15 - 32 * (5 / 9)),
    kelvin: unit('kelvin', 'Kelvin', 'K', 'temperature', (0, exports.createDimensionVector)({ Temp: 1 }), 1),
};
exports.DEFAULT_UNIT_REGISTRY = Object.values(exports.UNIT_DEFINITIONS);
const convertValueToBaseUnits = (value, unit) => {
    if (unit.conversion.kind === 'affine') {
        return value * unit.conversion.toBaseFactor + unit.conversion.toBaseOffset;
    }
    return value * unit.conversion.toBaseFactor;
};
exports.convertValueToBaseUnits = convertValueToBaseUnits;
const convertValueFromBaseUnits = (baseValue, unit) => {
    if (unit.conversion.kind === 'affine') {
        return (baseValue - unit.conversion.toBaseOffset) / unit.conversion.toBaseFactor;
    }
    return baseValue / unit.conversion.toBaseFactor;
};
exports.convertValueFromBaseUnits = convertValueFromBaseUnits;
