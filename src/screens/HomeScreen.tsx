import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { parser } from '../parser';
import { expressionEvaluator } from '../engine/evaluation';
import {
  DEFAULT_UNIT_REGISTRY,
  BASE_DIMENSIONS,
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
  readonly preferredUnitId: string | null;
  readonly preferredPower: number | null;
}

const compactPadButtons: readonly PadButton[] = [
  { label: 'C', action: 'clear', variant: 'danger' },
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
  { label: 'C', action: 'clear', variant: 'danger' },
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
    return '0';
  }

  return tokens.reduce((output, token, index) => {
    const previous = tokens[index - 1];
    const separator = tokenSpacingNeeded(previous, token) ? ' ' : '';
    return `${output}${separator}${token.value}`;
  }, '');
};

const findUnitByToken = (token: string): UnitDefinition | undefined =>
  DEFAULT_UNIT_REGISTRY.find((unit) => unit.symbol === token || unit.id === token);

const derivePowerForUnit = (
  unit: UnitDefinition,
  resultDimension: DimensionVector,
): number | null => {
  let power: number | null = null;

  for (const baseDimension of BASE_DIMENSIONS) {
    const baseExponent = unit.dimension[baseDimension] ?? 0;
    const resultExponent = resultDimension[baseDimension] ?? 0;

    if (baseExponent === 0 && resultExponent === 0) {
      continue;
    }

    if (baseExponent === 0 || resultExponent % baseExponent !== 0) {
      return null;
    }

    const candidatePower = resultExponent / baseExponent;
    if (power === null) {
      power = candidatePower;
    } else if (power !== candidatePower) {
      return null;
    }
  }

  return power;
};

const isCompatibleWithAnswer = (
  unit: UnitDefinition,
  answer: ResolvedAnswer,
): boolean => {
  if (unit.conversion.kind !== 'linear' || answer.preferredPower === null || answer.preferredPower === 0) {
    return false;
  }

  for (const baseDimension of BASE_DIMENSIONS) {
    const unitExponent = unit.dimension[baseDimension] ?? 0;
    const answerExponent = answer.dimension[baseDimension] ?? 0;

    if (unitExponent * answer.preferredPower !== answerExponent) {
      return false;
    }
  }

  return true;
};

const formatAnswerDisplay = (
  answer: ResolvedAnswer | null,
  selectedUnitId: string | null,
): { resultText: string; numericText: string; unitText: string | null } => {
  if (!answer) {
    return { resultText: '0', numericText: '0', unitText: null };
  }

  const selectedUnit = selectedUnitId
    ? DEFAULT_UNIT_REGISTRY.find(unit => unit.id === selectedUnitId)
    : undefined;

  if (
    !selectedUnit ||
    !answer.preferredPower ||
    answer.preferredPower === 0 ||
    !isCompatibleWithAnswer(selectedUnit, answer)
  ) {
    const numericText = Number(answer.value.toPrecision(12)).toString();
    return { resultText: numericText, numericText, unitText: null };
  }

  const convertedValue = answer.value / Math.pow(selectedUnit.conversion.toBaseFactor, answer.preferredPower);
  const numericText = Number(convertedValue.toPrecision(12)).toString();
  const unitText = answer.preferredPower === 1
    ? selectedUnit.symbol
    : formatUnitWithSuperscripts(`${selectedUnit.symbol}^${answer.preferredPower}`);

  return {
    resultText: `${numericText} ${unitText}`,
    numericText,
    unitText,
  };
};

const resolveAnswer = (expression: string): ResolvedAnswer => {
  const parsed = parser.parse(expression);
  const evaluation = expressionEvaluator.evaluate(parsed, { units: DEFAULT_UNIT_REGISTRY });
  const firstUnitToken = parsed.tokens.find((token) => token.type === 'unit');

  if (!firstUnitToken) {
    return {
      value: evaluation.value,
      dimension: evaluation.dimension,
      preferredUnitId: null,
      preferredPower: null,
    };
  }

  const preferredUnit = findUnitByToken(firstUnitToken.lexeme);

  if (!preferredUnit || preferredUnit.conversion.kind !== 'linear') {
    return {
      value: evaluation.value,
      dimension: evaluation.dimension,
      preferredUnitId: null,
      preferredPower: null,
    };
  }

  const preferredPower = derivePowerForUnit(preferredUnit, evaluation.dimension);

  return {
    value: evaluation.value,
    dimension: evaluation.dimension,
    preferredUnitId: preferredPower ? preferredUnit.id : null,
    preferredPower,
  };
};

export const HomeScreen = () => {
  const [tokens, setTokens] = useState<readonly InputToken[]>([]);
  const [lastResult, setLastResult] = useState('0');
  const [lastResolvedAnswer, setLastResolvedAnswer] = useState<ResolvedAnswer | null>(null);
  const [selectedAnswerUnitId, setSelectedAnswerUnitId] = useState<string | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<readonly HistoryEntry[]>([]);
  const [bottomSheetMode, setBottomSheetMode] = useState<BottomSheetMode>(null);
  const [recentUnits, setRecentUnits] = useState<readonly string[]>([]);
  const [morePadVisible, setMorePadVisible] = useState(false);

  const inputPreview = useMemo(() => formatTokens(tokens), [tokens]);
  const answerDisplay = useMemo(
    () => formatAnswerDisplay(lastResolvedAnswer, selectedAnswerUnitId),
    [lastResolvedAnswer, selectedAnswerUnitId],
  );

  const compatibleUnits = useMemo(() => {
    if (!lastResolvedAnswer) {
      return [];
    }

    return DEFAULT_UNIT_REGISTRY
      .filter(unit => isCompatibleWithAnswer(unit, lastResolvedAnswer))
      .sort((left, right) => left.symbol.localeCompare(right.symbol));
  }, [lastResolvedAnswer]);

  const trackRecentUnit = (unit: string): void => {
    setRecentUnits(previous => [unit, ...previous.filter(item => item !== unit)].slice(0, 4));
  };

  const pushToken = (tokenType: TokenType, value: string): void => {
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
  };

  const insertAnswerToken = (): void => {
    pushToken('answer', answerDisplay.numericText);
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

    if (expression === '0') {
      return;
    }

    let result = '';

    try {
      const resolvedAnswer = resolveAnswer(expression);
      const nextSelectedUnitId = resolvedAnswer.preferredUnitId;
      const nextDisplay = formatAnswerDisplay(resolvedAnswer, nextSelectedUnitId);

      setLastResolvedAnswer(resolvedAnswer);
      setSelectedAnswerUnitId(nextSelectedUnitId);
      result = nextDisplay.resultText;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid expression.';
      result = `Error: ${message}`;
      setLastResolvedAnswer(null);
      setSelectedAnswerUnitId(null);
    }

    setLastResult(result);
    storeToHistory(expression, result);
    setTokens([]);
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

  const openAnswerUnitSheet = (): void => {
    if (!answerDisplay.unitText || compatibleUnits.length === 0) {
      return;
    }

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
          {answerDisplay.unitText ? (
            <Pressable onPress={openAnswerUnitSheet} style={({ pressed }) => [styles.resultUnitChip, pressed && styles.scaleDown]}>
              <Text style={styles.resultUnitText}>{answerDisplay.unitText}</Text>
            </Pressable>
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
            columns={gridColumns}
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
                    {compatibleUnits.map(unit => {
                      const selected = unit.id === selectedAnswerUnitId;
                      const label = lastResolvedAnswer?.preferredPower === 1
                        ? unit.symbol
                        : formatUnitWithSuperscripts(`${unit.symbol}^${lastResolvedAnswer?.preferredPower}`);

                      return (
                        <Pressable
                          key={unit.id}
                          style={({ pressed }) => [
                            styles.unitChip,
                            selected && styles.unitChipSelected,
                            pressed && styles.scaleDown,
                          ]}
                          onPress={() => {
                            setSelectedAnswerUnitId(unit.id);
                            setLastResult(formatAnswerDisplay(lastResolvedAnswer, unit.id).resultText);
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
  columns,
  compact,
}: {
  button: PadButton;
  onPress: (button: PadButton) => void;
  columns: number;
  compact: boolean;
}) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.key,
        { width: `${(100 / columns) - 2}%` },
        button.variant === 'operator' && styles.keyOperator,
        button.variant === 'accent' && styles.keyAccent,
        button.variant === 'danger' && styles.keyDanger,
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
    justifyContent: 'space-between',
    alignContent: 'flex-start',
    marginTop: 4,
    rowGap: 10,
  },
  key: {
    aspectRatio: 1,
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
