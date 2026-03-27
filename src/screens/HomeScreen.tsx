import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type TokenType =
  | 'number'
  | 'operator'
  | 'paren'
  | 'power'
  | 'unit'
  | 'answer';

interface InputToken {
  readonly id: string;
  readonly type: TokenType;
  readonly value: string;
}

interface PadButton {
  readonly label: string;
  readonly tokenType?: TokenType;
  readonly tokenValue?: string;
  readonly action?: 'del' | 'ans';
}

const numberButtons: readonly PadButton[] = [
  { label: '7', tokenType: 'number', tokenValue: '7' },
  { label: '8', tokenType: 'number', tokenValue: '8' },
  { label: '9', tokenType: 'number', tokenValue: '9' },
  { label: '4', tokenType: 'number', tokenValue: '4' },
  { label: '5', tokenType: 'number', tokenValue: '5' },
  { label: '6', tokenType: 'number', tokenValue: '6' },
  { label: '1', tokenType: 'number', tokenValue: '1' },
  { label: '2', tokenType: 'number', tokenValue: '2' },
  { label: '3', tokenType: 'number', tokenValue: '3' },
  { label: '0', tokenType: 'number', tokenValue: '0' },
  { label: '.', tokenType: 'number', tokenValue: '.' },
];

const operatorButtons: readonly PadButton[] = [
  { label: '+', tokenType: 'operator', tokenValue: '+' },
  { label: '-', tokenType: 'operator', tokenValue: '-' },
  { label: '×', tokenType: 'operator', tokenValue: '*' },
  { label: '÷', tokenType: 'operator', tokenValue: '/' },
  { label: '^', tokenType: 'power', tokenValue: '^' },
];

const parenButtons: readonly PadButton[] = [
  { label: '(', tokenType: 'paren', tokenValue: '(' },
  { label: ')', tokenType: 'paren', tokenValue: ')' },
];

const unitButtons: readonly PadButton[] = [
  { label: 'm', tokenType: 'unit', tokenValue: 'm' },
  { label: 'km', tokenType: 'unit', tokenValue: 'km' },
  { label: 's', tokenType: 'unit', tokenValue: 's' },
  { label: 'min', tokenType: 'unit', tokenValue: 'min' },
  { label: 'kg', tokenType: 'unit', tokenValue: 'kg' },
  { label: 'N', tokenType: 'unit', tokenValue: 'N' },
];

const actionButtons: readonly PadButton[] = [
  { label: 'ANS', action: 'ans' },
  { label: 'DEL', action: 'del' },
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
  const [lastResult] = useState('0');

  const inputPreview = useMemo(() => formatTokens(tokens), [tokens]);

  const pushToken = (tokenType: TokenType, value: string): void => {
    const nextToken: InputToken = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: tokenType,
      value,
    };

    setTokens(previous => [...previous, nextToken]);
  };

  const removeLastToken = (): void => {
    setTokens(previous => previous.slice(0, -1));
  };

  const insertAnswerToken = (): void => {
    pushToken('answer', lastResult);
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

    if (button.tokenType && button.tokenValue) {
      pushToken(button.tokenType, button.tokenValue);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unit Calculator</Text>

      <View style={styles.displayCard}>
        <Text style={styles.displayLabel}>Input (token-based)</Text>
        <Text style={styles.displayValue}>{inputPreview}</Text>
        <Text style={styles.resultLabel}>ANS = {lastResult}</Text>
      </View>

      <ScrollView style={styles.padScroll} contentContainerStyle={styles.padContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Numbers</Text>
          <View style={styles.rowWrap}>
            {numberButtons.map(button => (
              <PadKey
                key={`num-${button.label}`}
                button={button}
                onPress={handleButtonPress}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operators / Parentheses / ^</Text>
          <View style={styles.rowWrap}>
            {[...operatorButtons, ...parenButtons].map(button => (
              <PadKey
                key={`op-${button.label}`}
                button={button}
                onPress={handleButtonPress}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Units</Text>
          <View style={styles.rowWrap}>
            {unitButtons.map(button => (
              <PadKey
                key={`unit-${button.label}`}
                button={button}
                onPress={handleButtonPress}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.rowWrap}>
            {actionButtons.map(button => (
              <PadKey
                key={`action-${button.label}`}
                button={button}
                onPress={handleButtonPress}
              />
            ))}
          </View>
        </View>
      </ScrollView>
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
      style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
      onPress={() => onPress(button)}
    >
      <Text style={styles.keyLabel}>{button.label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f4f7fb',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  displayCard: {
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 12,
  },
  displayLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 6,
  },
  displayValue: {
    fontSize: 24,
    fontWeight: '600',
    minHeight: 32,
  },
  resultLabel: {
    marginTop: 8,
    fontSize: 13,
    color: '#3d4f73',
  },
  padScroll: {
    flex: 1,
  },
  padContent: {
    paddingBottom: 24,
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    color: '#44536e',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  key: {
    minWidth: 56,
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: {
    backgroundColor: '#e9efff',
  },
  keyLabel: {
    fontWeight: '700',
    fontSize: 16,
    color: '#1b2a42',
  },
});
