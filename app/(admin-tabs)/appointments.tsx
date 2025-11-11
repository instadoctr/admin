import { View, Text, StyleSheet } from 'react-native';

export default function AppointmentsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Appointment Management</Text>
      <Text style={styles.subtitle}>Appointments will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
