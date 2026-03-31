import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { parser } from '../parser';
import { expressionEvaluator } from '../engine/evaluation';
import {
  DEFAULT_UNIT_REGISTRY,
  BASE_DIMENSIONS,
  type BaseDimension,
  type DimensionVector,
  type UnitDefinition,
} from '../engine/units';
import { formatUnitWithSuperscripts } from '../utils';

type TokenType =
  | 'number'
  | 'operator'
  | 'paren'
  | 'power'
  | 'unit'
  | 'answer';

type BottomSheetMode = 'inputUnits' | 'answerUnits' | null;

interface InputToken {
  readonly id: string;
  readonly type: TokenType;
  readonly value: string;
}

interface PadButton {
  readonly label: string;
  readonly tokenType?: TokenType;
  readonly tokenValue?: string;
  readonly action?: 'del' | 'ans' | 'clear' | 'equals' | 'tenPower' | 'ePower' | 'square' | 'sqrt' | 'factorial' | 'percent';
  readonly variant?: 'default' | 'operator' | 'accent' | 'danger';
}

interface HistoryEntry {
  readonly id: string;
  readonly expression: string;
  readonly result: string;
}

interface UnitCategory {
  readonly key: string;
  readonly label: string;
  readonly units: readonly string[];
}

interface ResolvedAnswer {
  readonly value: number;
  readonly dimension: DimensionVector;
  readonly preferredUnitsByDimension: Readonly<Partial<Record<BaseDimension, string>>>;
}

const compactPadButtons: readonly PadButton[] = [
  { label: 'AC', action: 'clear', variant: 'danger' },
  { label: 'DEL', action: 'del', variant: 'operator' },
  { label: '^', tokenType: 'power', tokenValue: '^', variant: 'operator' },
  { label: '÷', tokenType: 'operator', tokenValue: '/', variant: 'operator' },

  { label: '7', tokenType: 'number', tokenValue: '7' },
  { label: '8', tokenType: 'number', tokenValue: '8' },
  { label: '9', tokenType: 'number', tokenValue: '9' },
  { label: '×', tokenType: 'operator', tokenValue: '*', variant: 'operator' },

  { label: '4', tokenType: 'number', tokenValue: '4' },
  { label: '5', tokenType: 'number', tokenValue: '5' },
  { label: '6', tokenType: 'number', tokenValue: '6' },
  { label: '-', tokenType: 'operator', tokenValue: '-', variant: 'operator' },

  { label: '1', tokenType: 'number', tokenValue: '1' },
  { label: '2', tokenType: 'number', tokenValue: '2' },
  { label: '3', tokenType: 'number', tokenValue: '3' },
  { label: '+', tokenType: 'operator', tokenValue: '+', variant: 'operator' },

  { label: 'ANS', action: 'ans' },
  { label: '0', tokenType: 'number', tokenValue: '0' },
  { label: '.', tokenType: 'number', tokenValue: '.' },
  { label: '=', action: 'equals', variant: 'accent' },
];

const expandedPadButtons: readonly PadButton[] = [
  { label: '(', tokenType: 'paren', tokenValue: '(', variant: 'operator' },
  { label: ')', tokenType: 'paren', tokenValue: ')', variant: 'operator' },
  { label: '%', action: 'percent', variant: 'operator' },
  { label: 'π', tokenType: 'number', tokenValue: '3.1415926535', variant: 'operator' },
  { label: '!', action: 'factorial', variant: 'operator' },

  { label: '10^', action: 'tenPower', variant: 'operator' },
  { label: 'AC', action: 'clear', variant: 'danger' },
  { label: 'DEL', action: 'del', variant: 'operator' },
  { label: '^', tokenType: 'power', tokenValue: '^', variant: 'operator' },
  { label: '÷', tokenType: 'operator', tokenValue: '/', variant: 'operator' },

  { label: 'e', tokenType: 'number', tokenValue: '2.7182818284', variant: 'operator' },
  { label: '7', tokenType: 'number', tokenValue: '7' },
  { label: '8', tokenType: 'number', tokenValue: '8' },
  { label: '9', tokenType: 'number', tokenValue: '9' },
  { label: '×', tokenType: 'operator', tokenValue: '*', variant: 'operator' },

  { label: 'e^', action: 'ePower', variant: 'operator' },
  { label: '4', tokenType: 'number', tokenValue: '4' },
  { label: '5', tokenType: 'number', tokenValue: '5' },
  { label: '6', tokenType: 'number', tokenValue: '6' },
  { label: '-', tokenType: 'operator', tokenValue: '-', variant: 'operator' },

  { label: '√', action: 'sqrt', variant: 'operator' },
  { label: '1', tokenType: 'number', tokenValue: '1' },
  { label: '2', tokenType: 'number', tokenValue: '2' },
  { label: '3', tokenType: 'number', tokenValue: '3' },
  { label: '+', tokenType: 'operator', tokenValue: '+', variant: 'operator' },

  { label: 'x²', action: 'square', variant: 'operator' },
  { label: 'ANS', action: 'ans' },
  { label: '0', tokenType: 'number', tokenValue: '0' },
  { label: '.', tokenType: 'number', tokenValue: '.' },
  { label: '=', action: 'equals', variant: 'accent' },
];

const UNIT_CATEGORIES: readonly UnitCategory[] = [
  { key: 'length', label: 'Length', units: ['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi'] },
  { key: 'mass', label: 'Mass', units: ['mg', 'g', 'kg', 't', 'oz', 'lb', 'ton'] },
  { key: 'time', label: 'Time', units: ['ms', 's', 'min', 'h', 'day'] },
  { key: 'temp', label: 'Temperature', units: ['°C', 'K', '°F'] },
];

const tokenSpacingNeeded = (
  previous: InputToken | undefined,
  current: InputToken,
): boolean => {
  if (!previous) {
    return false;
  }

  const numberOrUnit = new Set<TokenType>(['number', 'unit', 'answer']);

  return !(
    numberOrUnit.has(previous.type) && numberOrUnit.has(current.type)
  );
};

const formatTokens = (tokens: readonly InputToken[]): string => {
  if (tokens.length === 0) {
    return '';
  }

  return tokens.reduce((output, token, index) => {
    const previous = tokens[index - 1];
    const separator = tokenSpacingNeeded(previous, token) ? ' ' : '';
    return `${output}${separator}${token.value}`;
  }, '');
};

const findUnitByToken = (token: string): UnitDefinition | undefined =>
  DEFAULT_UNIT_REGISTRY.find((unit) => unit.symbol === token || unit.id === token);

const getUnitBaseDimension = (unit: UnitDefinition): BaseDimension | null => {
  const nonZeroDimensions = BASE_DIMENSIONS.filter(baseDimension => (unit.dimension[baseDimension] ?? 0) !== 0);
  if (nonZeroDimensions.length !== 1) {
    return null;
  }

  const [baseDimension] = nonZeroDimensions;
  return (unit.dimension[baseDimension] ?? 0) === 1 ? baseDimension : null;
};

const getLinearUnitsForBaseDimension = (baseDimension: BaseDimension): readonly UnitDefinition[] =>
  DEFAULT_UNIT_REGISTRY
    .filter(unit => getUnitBaseDimension(unit) === baseDimension)
    .sort((left, right) => left.symbol.localeCompare(right.symbol));

const getDefaultUnitIdForBaseDimension = (baseDimension: BaseDimension): string | null => {
  const canonical = getLinearUnitsForBaseDimension(baseDimension).find(unit => unit.conversion.toBaseFactor === 1);
  return canonical?.id ?? null;
};

const formatUnitToken = (unitSymbol: string, exponent: number): string =>
  exponent === 1 ? unitSymbol : formatUnitWithSuperscripts(`${unitSymbol}^${exponent}`);

interface UnitTerm {
  readonly baseDimension: BaseDimension;
  readonly exponent: number;
  readonly unit: UnitDefinition;
}

interface UnitLayout {
  readonly numerator: readonly UnitTerm[];
  readonly denominator: readonly UnitTerm[];
}

const SCIENTIFIC_NOTATION_THRESHOLD = 1e9;
const MAX_DECIMAL_PLACES = 8;
const SCIENTIFIC_SIGNIFICANT_DIGITS = 6;

const trimTrailingZeros = (value: string): string =>
  value.replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '');

const formatNumericValue = (value: number): string => {
  if (!Number.isFinite(value)) {
    return value.toString();
  }

  const absolute = Math.abs(value);
  const fixed = Number(value.toPrecision(12));
  const fixedText = fixed.toString();
  const fractional = fixedText.split('.')[1];
  const hasManyDecimals = Boolean(fractional && fractional.length > MAX_DECIMAL_PLACES);
  const shouldUseScientific = absolute >= SCIENTIFIC_NOTATION_THRESHOLD || hasManyDecimals;

  if (!shouldUseScientific) {
    return fixedText;
  }

  return trimTrailingZeros(value.toExponential(SCIENTIFIC_SIGNIFICANT_DIGITS));
};

const buildUnitLayout = (
  answer: ResolvedAnswer,
  selectedUnitsByDimension: Readonly<Partial<Record<BaseDimension, string>>>,
): UnitLayout | null => {
  const numerator: UnitTerm[] = [];
  const denominator: UnitTerm[] = [];

  for (const baseDimension of BASE_DIMENSIONS) {
    const exponent = answer.dimension[baseDimension] ?? 0;
    if (exponent === 0) {
      continue;
    }

    const selectedUnitId = selectedUnitsByDimension[baseDimension] ?? getDefaultUnitIdForBaseDimension(baseDimension);
    if (!selectedUnitId) {
      return null;
    }

    const selectedUnit = DEFAULT_UNIT_REGISTRY.find(unit => unit.id === selectedUnitId);
    if (!selectedUnit) {
      return null;
    }

    const target = exponent > 0 ? numerator : denominator;
    target.push({
      baseDimension,
      exponent: Math.abs(exponent),
      unit: selectedUnit,
    });
  }

  return { numerator, denominator };
};

const formatAnswerDisplay = (
  answer: ResolvedAnswer | null,
  selectedUnitsByDimension: Readonly<Partial<Record<BaseDimension, string>>>,
): { resultText: string; numericText: string; unitLayout: UnitLayout | null; ansTokenText: string } => {
  if (!answer) {
    return { resultText: '', numericText: '', unitLayout: null, ansTokenText: '' };
  }

  const unitLayout = buildUnitLayout(answer, selectedUnitsByDimension);
  if (!unitLayout) {
    const numericText = formatNumericValue(answer.value);
    return { resultText: numericText, numericText, unitLayout: null, ansTokenText: numericText };
  }

  const conversionDivisor = [...unitLayout.numerator, ...unitLayout.denominator].reduce((product, term) => {
    const signedExponent = (answer.dimension[term.baseDimension] ?? 0);
    return product * Math.pow(term.unit.conversion.toBaseFactor, signedExponent);
  }, 1);
  const convertedValue = answer.value / conversionDivisor;
  const numericText = formatNumericValue(convertedValue);
  const numeratorText = unitLayout.numerator
    .map(term => formatUnitToken(term.unit.symbol, term.exponent))
    .join(' * ');
  const denominatorText = unitLayout.denominator
    .map(term => formatUnitToken(term.unit.symbol, term.exponent))
    .join(' * ');
  const unitText = denominatorText.length === 0
    ? numeratorText
    : `${numeratorText || '1'} / ${denominatorText}`;

  if (unitText.length === 0) {
    return {
      resultText: numericText,
      numericText,
      unitLayout: null,
      ansTokenText: numericText,
    };
  }

  const ansUnitText = denominatorText.length === 0
    ? unitLayout.numerator.map(term => `${term.unit.symbol}${term.exponent === 1 ? '' : `^${term.exponent}`}`).join(' * ')
    : `${unitLayout.numerator.length === 0
      ? '1'
      : unitLayout.numerator.map(term => `${term.unit.symbol}${term.exponent === 1 ? '' : `^${term.exponent}`}`).join(' * ')
    } / ${unitLayout.denominator.map(term => `${term.unit.symbol}${term.exponent === 1 ? '' : `^${term.exponent}`}`).join(' * ')}`;

  return {
    resultText: `${numericText} ${unitText}`,
    numericText,
    unitLayout,
    ansTokenText: `${numericText} ${ansUnitText}`,
  };
};

const resolveAnswer = (expression: string): ResolvedAnswer => {
  const parsed = parser.parse(expression);
  const evaluation = expressionEvaluator.evaluate(parsed, { units: DEFAULT_UNIT_REGISTRY });
  const preferredUnitsByDimension: Partial<Record<BaseDimension, string>> = {};

  parsed.tokens
    .filter((token) => token.type === 'unit')
    .forEach((token) => {
      const preferredUnit = findUnitByToken(token.lexeme);
      if (!preferredUnit) {
        return;
      }
      const baseDimension = getUnitBaseDimension(preferredUnit);
      if (!baseDimension) {
        return;
      }
      if ((evaluation.dimension[baseDimension] ?? 0) === 0 || preferredUnitsByDimension[baseDimension]) {
        return;
      }

      preferredUnitsByDimension[baseDimension] = preferredUnit.id;
    });

  return {
    value: evaluation.value,
    dimension: evaluation.dimension,
    preferredUnitsByDimension,
  };
};

export const HomeScreen = () => {
  const { width: windowWidth } = useWindowDimensions();
  const [tokens, setTokens] = useState<readonly InputToken[]>([]);
  const [lastResult, setLastResult] = useState('');
  const [lastResolvedAnswer, setLastResolvedAnswer] = useState<ResolvedAnswer | null>(null);
  const [selectedAnswerUnitsByDimension, setSelectedAnswerUnitsByDimension] = useState<Partial<Record<BaseDimension, string>>>({});
  const [activeAnswerUnitDimension, setActiveAnswerUnitDimension] = useState<BaseDimension | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<readonly HistoryEntry[]>([]);
  const [bottomSheetMode, setBottomSheetMode] = useState<BottomSheetMode>(null);
  const [recentUnits, setRecentUnits] = useState<readonly string[]>([]);
  const [morePadVisible, setMorePadVisible] = useState(false);
  const [clearInputOnNextEntry, setClearInputOnNextEntry] = useState(false);

  const inputPreview = useMemo(() => formatTokens(tokens), [tokens]);
  const answerDisplay = useMemo(
    () => formatAnswerDisplay(lastResolvedAnswer, selectedAnswerUnitsByDimension),
    [lastResolvedAnswer, selectedAnswerUnitsByDimension],
  );

  const compatibleUnitsForActiveDimension = useMemo(() => {
    if (!activeAnswerUnitDimension) {
      return [];
    }

    return getLinearUnitsForBaseDimension(activeAnswerUnitDimension);
  }, [activeAnswerUnitDimension]);

  const trackRecentUnit = (unit: string): void => {
    setRecentUnits(previous => [unit, ...previous.filter(item => item !== unit)].slice(0, 4));
  };

  const pushToken = (tokenType: TokenType, value: string): void => {
    if (clearInputOnNextEntry) {
      setTokens([]);
      setClearInputOnNextEntry(false);
    }

    const nextToken: InputToken = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: tokenType,
      value,
    };

    setTokens(previous => [...previous, nextToken]);

    if (tokenType === 'unit') {
      trackRecentUnit(value);
    }
  };

  const removeLastToken = (): void => {
    setTokens(previous => previous.slice(0, -1));
  };

  const clearAllTokens = (): void => {
    setTokens([]);
    setLastResolvedAnswer(null);
    setSelectedAnswerUnitsByDimension({});
    setActiveAnswerUnitDimension(null);
    setLastResult('');
    setClearInputOnNextEntry(false);
  };

  const insertAnswerToken = (): void => {
    pushToken('answer', answerDisplay.ansTokenText);
  };

  const pushTokenBatch = (next: ReadonlyArray<{ type: TokenType; value: string }>): void => {
    next.forEach(item => pushToken(item.type, item.value));
  };

  const storeToHistory = (expression: string, result: string): void => {
    const nextEntry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      expression,
      result,
    };

    setHistoryEntries(previous => [nextEntry, ...previous].slice(0, 8));
  };

  const resolveExpression = (): void => {
    const expression = inputPreview;

    if (expression.trim().length === 0) {
      return;
    }

    let result = '';

    try {
      const resolvedAnswer = resolveAnswer(expression);
      const nextSelectedUnits = resolvedAnswer.preferredUnitsByDimension;
      const nextDisplay = formatAnswerDisplay(resolvedAnswer, nextSelectedUnits);

      setLastResolvedAnswer(resolvedAnswer);
      setSelectedAnswerUnitsByDimension(nextSelectedUnits);
      result = nextDisplay.resultText;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid expression.';
      result = `Error: ${message}`;
      setLastResolvedAnswer(null);
      setSelectedAnswerUnitsByDimension({});
      setActiveAnswerUnitDimension(null);
    }

    setLastResult(result);
    storeToHistory(expression, result);
    setClearInputOnNextEntry(true);
  };

  const handleButtonPress = (button: PadButton): void => {
    if (button.action === 'del') {
      removeLastToken();
      return;
    }

    if (button.action === 'ans') {
      insertAnswerToken();
      return;
    }

    if (button.action === 'clear') {
      clearAllTokens();
      return;
    }

    if (button.action === 'equals') {
      resolveExpression();
      return;
    }

    if (button.action === 'tenPower') {
      pushTokenBatch([
        { type: 'number', value: '10' },
        { type: 'power', value: '^' },
      ]);
      return;
    }

    if (button.action === 'ePower') {
      pushTokenBatch([
        { type: 'number', value: '2.7182818284' },
        { type: 'power', value: '^' },
      ]);
      return;
    }

    if (button.action === 'square') {
      pushTokenBatch([
        { type: 'power', value: '^' },
        { type: 'number', value: '2' },
      ]);
      return;
    }

    if (button.action === 'sqrt') {
      pushTokenBatch([
        { type: 'power', value: '^' },
        { type: 'paren', value: '(' },
        { type: 'number', value: '0.5' },
        { type: 'paren', value: ')' },
      ]);
      return;
    }

    if (button.action === 'percent') {
      pushTokenBatch([
        { type: 'operator', value: '/' },
        { type: 'number', value: '100' },
      ]);
      return;
    }

    if (button.action === 'factorial') {
      return;
    }

    if (button.tokenType && button.tokenValue) {
      pushToken(button.tokenType, button.tokenValue);
    }
  };

  const activePadButtons = morePadVisible ? expandedPadButtons : compactPadButtons;
  const gridColumns = morePadVisible ? 5 : 4;
  const keyGap = 10;
  const keypadHorizontalPadding = 32;
  const keySize = Math.floor((windowWidth - keypadHorizontalPadding - (keyGap * (gridColumns - 1))) / gridColumns);

  const openAnswerUnitSheet = (baseDimension: BaseDimension): void => {
    if (!answerDisplay.unitLayout) {
      return;
    }

    setActiveAnswerUnitDimension(baseDimension);
    setBottomSheetMode('answerUnits');
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topBarActions}>
          <Pressable
            style={({ pressed }) => [
              styles.historyButton,
              bottomSheetMode === 'inputUnits' && styles.historyButtonActive,
              pressed && styles.scaleDown,
            ]}
            onPress={() => setBottomSheetMode(previous => (previous === 'inputUnits' ? null : 'inputUnits'))}
          >
            <Text
              style={[
                styles.historyButtonLabel,
                bottomSheetMode === 'inputUnits' && styles.historyButtonLabelActive,
              ]}
            >
              Units
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.historyButton, pressed && styles.scaleDown]}
            onPress={() => setHistoryVisible(previous => !previous)}
          >
            <Text style={styles.historyButtonLabel}>History</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.historyButton,
              morePadVisible && styles.historyButtonActive,
              pressed && styles.scaleDown,
            ]}
            onPress={() => setMorePadVisible(previous => !previous)}
          >
            <Text style={[styles.historyButtonLabel, morePadVisible && styles.historyButtonLabelActive]}>
              More
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.displayCard}>
        <Text style={styles.expressionText} numberOfLines={2}>
          {inputPreview}
        </Text>
        <View style={styles.resultRow}>
          <Text style={styles.resultText} numberOfLines={1}>
            {answerDisplay.numericText}
          </Text>
          {answerDisplay.unitLayout ? (
            <View style={styles.resultUnitExpression}>
              {answerDisplay.unitLayout.numerator.map((term, index) => (
                <View key={`${term.baseDimension}-num`} style={styles.resultUnitTokenRow}>
                  {index > 0 ? <Text style={styles.resultUnitOperator}>*</Text> : null}
                  <Pressable
                    onPress={() => openAnswerUnitSheet(term.baseDimension)}
                    style={({ pressed }) => [styles.resultUnitChip, pressed && styles.scaleDown]}
                  >
                    <Text style={styles.resultUnitText}>{formatUnitToken(term.unit.symbol, term.exponent)}</Text>
                  </Pressable>
                </View>
              ))}
              {answerDisplay.unitLayout.denominator.length > 0 ? (
                <Text style={styles.resultUnitOperator}>/</Text>
              ) : null}
              {answerDisplay.unitLayout.denominator.map((term, index) => (
                <View key={`${term.baseDimension}-den`} style={styles.resultUnitTokenRow}>
                  {index > 0 ? <Text style={styles.resultUnitOperator}>*</Text> : null}
                  <Pressable
                    onPress={() => openAnswerUnitSheet(term.baseDimension)}
                    style={({ pressed }) => [styles.resultUnitChip, pressed && styles.scaleDown]}
                  >
                    <Text style={styles.resultUnitText}>{formatUnitToken(term.unit.symbol, term.exponent)}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.quickBar}>
        <Text style={styles.quickBarLabel}>Quick units</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {recentUnits.length === 0 ? (
            <Text style={styles.quickBarEmpty}>No recent units</Text>
          ) : (
            recentUnits.map(unit => (
              <Pressable
                key={unit}
                style={({ pressed }) => [styles.quickUnitChip, pressed && styles.scaleDown]}
                onPress={() => pushToken('unit', unit)}
              >
                <Text style={styles.quickUnitChipLabel}>{unit}</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>

      {historyVisible && (
        <View style={styles.historyPanel}>
          <Text style={styles.historyTitle}>Recent</Text>
          {historyEntries.length === 0 ? (
            <Text style={styles.historyEmpty}>No history yet</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {historyEntries.map(item => (
                <View key={item.id} style={styles.historyChip}>
                  <Text style={styles.historyExpression} numberOfLines={1}>
                    {item.expression}
                  </Text>
                  <Text style={styles.historyResult} numberOfLines={1}>
                    {item.result}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <View style={styles.keypadGrid}>
        {activePadButtons.map((button, index) => (
          <PadKey
            key={`${button.label}-${index}`}
            button={button}
            onPress={handleButtonPress}
            keySize={keySize}
            compact={morePadVisible}
          />
        ))}
      </View>

      {bottomSheetMode ? (
        <View style={styles.bottomSheetBackdrop}>
          <Pressable style={styles.bottomSheetDismissArea} onPress={() => setBottomSheetMode(null)} />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />

            {bottomSheetMode === 'inputUnits' ? (
              <ScrollView style={styles.bottomSheetScroll} contentContainerStyle={styles.unitOverlayContent}>
                {UNIT_CATEGORIES.map(category => (
                  <View key={category.key} style={styles.unitCategorySection}>
                    <Text style={styles.unitCategoryTitle}>{category.label}</Text>
                    <View style={styles.unitChipRow}>
                      {category.units.map(unit => (
                        <Pressable
                          key={unit}
                          style={({ pressed }) => [
                            styles.unitChip,
                            pressed && styles.scaleDown,
                          ]}
                          onPress={() => {
                            pushToken('unit', unit);
                            setBottomSheetMode(null);
                          }}
                        >
                          <Text style={styles.unitChipLabel}>{unit}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <ScrollView style={styles.bottomSheetScroll} contentContainerStyle={styles.unitOverlayContent}>
                <View style={styles.unitCategorySection}>
                  <Text style={styles.unitCategoryTitle}>Compatible units</Text>
                  <View style={styles.unitChipRow}>
                    {compatibleUnitsForActiveDimension.map(unit => {
                      const selected = activeAnswerUnitDimension
                        ? unit.id === selectedAnswerUnitsByDimension[activeAnswerUnitDimension]
                        : false;
                      const exponent = activeAnswerUnitDimension
                        ? Math.abs(lastResolvedAnswer?.dimension[activeAnswerUnitDimension] ?? 1)
                        : 1;
                      const label = formatUnitToken(unit.symbol, exponent);

                      return (
                        <Pressable
                          key={unit.id}
                          style={({ pressed }) => [
                            styles.unitChip,
                            selected && styles.unitChipSelected,
                            pressed && styles.scaleDown,
                          ]}
                          onPress={() => {
                            if (!activeAnswerUnitDimension) {
                              return;
                            }

                            setSelectedAnswerUnitsByDimension(previous => {
                              const next = { ...previous, [activeAnswerUnitDimension]: unit.id };
                              setLastResult(formatAnswerDisplay(lastResolvedAnswer, next).resultText);
                              return next;
                            });
                          }}
                        >
                          <Text style={[styles.unitChipLabel, selected && styles.unitChipLabelSelected]}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const PadKey = ({
  button,
  onPress,
  keySize,
  compact,
}: {
  button: PadButton;
  onPress: (button: PadButton) => void;
  keySize: number;
  compact: boolean;
}) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.key,
        { width: keySize, height: keySize },
        button.variant === 'operator' && styles.keyOperator,
        button.variant === 'accent' && styles.keyAccent,
        button.variant === 'danger' && styles.keyDanger,
        pressed && styles.keyPressed,
        pressed && button.variant === 'operator' && styles.keyOperatorPressed,
        pressed && button.variant === 'accent' && styles.keyAccentPressed,
        pressed && button.variant === 'danger' && styles.keyDangerPressed,
        pressed && styles.scaleDown,
      ]}
      onPress={() => onPress(button)}
    >
      <Text
        style={[
          styles.keyLabel,
          compact && styles.keyLabelCompact,
          button.variant === 'operator' && styles.keyLabelOperator,
          button.variant === 'accent' && styles.keyLabelAccent,
          button.variant === 'danger' && styles.keyLabelDanger,
        ]}
      >
        {button.label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f4f7',
    paddingTop: (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 18) + 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 10,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  historyButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  historyButtonActive: {
    backgroundColor: '#2563eb',
  },
  historyButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  historyButtonLabelActive: {
    color: '#ffffff',
  },
  displayCard: {
    borderRadius: 28,
    backgroundColor: '#ffffff',
    paddingVertical: 24,
    paddingHorizontal: 18,
    marginBottom: 12,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  expressionText: {
    textAlign: 'right',
    color: '#6b7280',
    fontSize: 28,
    fontWeight: '500',
    minHeight: 64,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  resultText: {
    textAlign: 'right',
    color: '#0f172a',
    fontSize: 34,
    fontWeight: '700',
  },
  resultUnitExpression: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  resultUnitTokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultUnitOperator: {
    color: '#1e3a8a',
    fontSize: 18,
    fontWeight: '700',
  },
  resultUnitChip: {
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resultUnitText: {
    color: '#1d4ed8',
    fontSize: 18,
    fontWeight: '700',
  },
  quickBar: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  quickBarLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '600',
  },
  quickBarEmpty: {
    fontSize: 13,
    color: '#9ca3af',
  },
  quickUnitChip: {
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  quickUnitChipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  historyPanel: {
    borderRadius: 20,
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '600',
  },
  historyEmpty: {
    fontSize: 13,
    color: '#9ca3af',
  },
  historyChip: {
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    minWidth: 140,
  },
  historyExpression: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  historyResult: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  keypadGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignContent: 'flex-end',
    marginTop: 4,
    columnGap: 10,
    rowGap: 10,
  },
  key: {
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyOperator: {
    backgroundColor: '#e5e7eb',
  },
  keyAccent: {
    backgroundColor: '#2563eb',
  },
  keyDanger: {
    backgroundColor: '#fee2e2',
  },
  keyPressed: {
    backgroundColor: '#e5e7eb',
  },
  keyOperatorPressed: {
    backgroundColor: '#d1d5db',
  },
  keyAccentPressed: {
    backgroundColor: '#1d4ed8',
  },
  keyDangerPressed: {
    backgroundColor: '#fecaca',
  },
  keyLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  keyLabelCompact: {
    fontSize: 17,
  },
  keyLabelOperator: {
    color: '#1f2937',
  },
  keyLabelAccent: {
    color: '#ffffff',
    fontWeight: '700',
  },
  keyLabelDanger: {
    color: '#b91c1c',
  },
  bottomSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    justifyContent: 'flex-end',
  },
  bottomSheetDismissArea: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '56%',
    paddingTop: 8,
    paddingBottom: 16,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d1d5db',
    marginBottom: 10,
  },
  bottomSheetScroll: {
    flexGrow: 0,
  },
  unitOverlayContent: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  unitCategorySection: {
    marginBottom: 16,
  },
  unitCategoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  unitChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitChip: {
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 56,
    alignItems: 'center',
  },
  unitChipSelected: {
    backgroundColor: '#2563eb',
  },
  unitChipLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  unitChipLabelSelected: {
    color: '#ffffff',
  },
  scaleDown: {
    transform: [{ scale: 0.96 }],
  },
});
