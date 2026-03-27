import { StyleSheet, Text, View } from 'react-native';

export const HomeScreen = (): JSX.Element => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unit Calculator</Text>
      <Text style={styles.subtitle}>Project scaffold ready.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
