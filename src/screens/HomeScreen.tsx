import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type TokenType =
  | 'number'
  | 'operator'
  | 'paren'
  | 'power'
  | 'unit'
  | 'answer';

type UnitMode = 'SI' | 'US';

interface InputToken {
  readonly id: string;
  readonly type: TokenType;
  readonly value: string;
}

interface PadButton {
  readonly label: string;
  readonly tokenType?: TokenType;
  readonly tokenValue?: string;
  readonly action?: 'del' | 'ans' | 'clear' | 'equals';
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

const mainPadButtons: readonly PadButton[] = [
  { label: 'C', action: 'clear', variant: 'danger' },
  { label: 'DEL', action: 'del', variant: 'operator' },
  { label: '(', tokenType: 'paren', tokenValue: '(', variant: 'operator' },
  { label: ')', tokenType: 'paren', tokenValue: ')', variant: 'operator' },

  { label: '7', tokenType: 'number', tokenValue: '7' },
  { label: '8', tokenType: 'number', tokenValue: '8' },
  { label: '9', tokenType: 'number', tokenValue: '9' },
  { label: '÷', tokenType: 'operator', tokenValue: '/', variant: 'operator' },

  { label: '4', tokenType: 'number', tokenValue: '4' },
  { label: '5', tokenType: 'number', tokenValue: '5' },
  { label: '6', tokenType: 'number', tokenValue: '6' },
  { label: '×', tokenType: 'operator', tokenValue: '*', variant: 'operator' },

  { label: '1', tokenType: 'number', tokenValue: '1' },
  { label: '2', tokenType: 'number', tokenValue: '2' },
  { label: '3', tokenType: 'number', tokenValue: '3' },
  { label: '-', tokenType: 'operator', tokenValue: '-', variant: 'operator' },

  { label: 'ANS', action: 'ans', variant: 'accent' },
  { label: '0', tokenType: 'number', tokenValue: '0' },
  { label: '.', tokenType: 'number', tokenValue: '.' },
  { label: '+', tokenType: 'operator', tokenValue: '+', variant: 'operator' },

  { label: '^', tokenType: 'power', tokenValue: '^', variant: 'operator' },
  { label: '%', tokenType: 'operator', tokenValue: '%', variant: 'operator' },
  { label: 'π', tokenType: 'number', tokenValue: '3.14159', variant: 'operator' },
  { label: '=', action: 'equals', variant: 'accent' },
];

const SI_UNIT_CATEGORIES: readonly UnitCategory[] = [
  { key: 'length', label: 'Length', units: ['mm', 'cm', 'm', 'km'] },
  { key: 'mass', label: 'Mass', units: ['mg', 'g', 'kg', 't'] },
  { key: 'time', label: 'Time', units: ['ms', 's', 'min', 'h'] },
  { key: 'temp', label: 'Temperature', units: ['°C', 'K'] },
];

const US_UNIT_CATEGORIES: readonly UnitCategory[] = [
  { key: 'length', label: 'Length', units: ['in', 'ft', 'yd', 'mi'] },
  { key: 'mass', label: 'Mass', units: ['oz', 'lb', 'ton'] },
  { key: 'time', label: 'Time', units: ['s', 'min', 'h', 'day'] },
  { key: 'temp', label: 'Temperature', units: ['°F'] },
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

export const HomeScreen = () => {
  const [tokens, setTokens] = useState<readonly InputToken[]>([]);
  const [lastResult, setLastResult] = useState('0');
  const [unitMode, setUnitMode] = useState<UnitMode>('SI');
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<readonly HistoryEntry[]>([]);
  const [unitOverlayVisible, setUnitOverlayVisible] = useState(false);
  const [recentUnits, setRecentUnits] = useState<readonly string[]>([]);

  const inputPreview = useMemo(() => formatTokens(tokens), [tokens]);
  const unitCategories = unitMode === 'SI' ? SI_UNIT_CATEGORIES : US_UNIT_CATEGORIES;

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
    pushToken('answer', lastResult);
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

    const unitTag = unitMode === 'SI' ? 'SI' : 'US';
    const result = `${expression} (${unitTag})`;

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

    if (button.tokenType && button.tokenValue) {
      pushToken(button.tokenType, button.tokenValue);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.brand}>Unit Calculator</Text>

        <View style={styles.topBarActions}>
          <Pressable
            style={({ pressed }) => [
              styles.historyButton,
              unitOverlayVisible && styles.historyButtonActive,
              pressed && styles.scaleDown,
            ]}
            onPress={() => setUnitOverlayVisible(previous => !previous)}
          >
            <Text
              style={[
                styles.historyButtonLabel,
                unitOverlayVisible && styles.historyButtonLabelActive,
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
        </View>
      </View>

      <View style={styles.unitToggleRow}>
        {(['SI', 'US'] as const).map(mode => {
          const selected = mode === unitMode;

          return (
            <Pressable
              key={mode}
              style={({ pressed }) => [
                styles.unitToggle,
                selected && styles.unitToggleSelected,
                pressed && styles.scaleDown,
              ]}
              onPress={() => setUnitMode(mode)}
            >
              <Text
                style={[styles.unitToggleLabel, selected && styles.unitToggleLabelSelected]}
              >
                {mode === 'SI' ? 'SI Units' : 'US Units'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.displayCard}>
        <Text style={styles.expressionText} numberOfLines={2}>
          {inputPreview}
        </Text>
        <Text style={styles.resultText} numberOfLines={2}>
          {lastResult}
        </Text>
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

      {unitOverlayVisible ? (
        <ScrollView style={styles.unitOverlay} contentContainerStyle={styles.unitOverlayContent}>
          {unitCategories.map(category => (
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
                    onPress={() => pushToken('unit', unit)}
                  >
                    <Text style={styles.unitChipLabel}>{unit}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.keypadGrid}>
          {mainPadButtons.map(button => (
            <PadKey key={button.label} button={button} onPress={handleButtonPress} />
          ))}
        </View>
      )}
    </View>
  );
};

const PadKey = ({
  button,
  onPress,
}: {
  button: PadButton;
  onPress: (button: PadButton) => void;
}) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.key,
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
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  brand: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
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
  unitToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  unitToggle: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
  },
  unitToggleSelected: {
    backgroundColor: '#111827',
  },
  unitToggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  unitToggleLabelSelected: {
    color: '#f9fafb',
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
  resultText: {
    textAlign: 'right',
    color: '#0f172a',
    fontSize: 34,
    fontWeight: '700',
    minHeight: 44,
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
  unitOverlay: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
  },
  unitOverlayContent: {
    padding: 14,
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
  unitChipLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  keypadGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  key: {
    width: '23%',
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
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
  scaleDown: {
    transform: [{ scale: 0.96 }],
  },
});
