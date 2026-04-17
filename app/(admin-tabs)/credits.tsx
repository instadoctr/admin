import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { adminAPI } from '@/services/api-client';

export default function CreditsScreen() {
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<{
    userName: string;
    amount: number;
    newBalance: number;
    transactionId: string;
  } | null>(null);

  const handleAddCredits = async () => {
    setError('');
    setSuccessData(null);

    // Client-side validation
    if (!userId.trim()) {
      setError('User ID is required.');
      return;
    }
    const parsedAmount = parseInt(amount, 10);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a positive whole number.');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }

    setLoading(true);
    try {
      const response = await adminAPI.creditUserWallet(
        userId.trim(),
        parsedAmount,
        reason.trim(),
        note.trim() || undefined
      );

      if (response.success && response.data) {
        setSuccessData({
          userName: response.data.user.name,
          amount: parsedAmount,
          newBalance: response.data.wallet.balance,
          transactionId: response.data.transaction.transactionId,
        });
        // Reset form fields after success
        setUserId('');
        setAmount('');
        setReason('');
        setNote('');
      } else {
        setError(response.error || response.message || 'Failed to add credits.');
      }
    } catch (err: any) {
      setError(err.message || 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add Wallet Credits</Text>
        <Text style={styles.subtitle}>Add impulse credits to a user's wallet.</Text>

        {/* User ID */}
        <Text style={styles.label}>User ID *</Text>
        <TextInput
          style={styles.input}
          value={userId}
          onChangeText={setUserId}
          placeholder="Paste user ID here"
          placeholderTextColor="#adb5bd"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Amount */}
        <Text style={styles.label}>Amount (impulses) *</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="e.g. 100"
          placeholderTextColor="#adb5bd"
          keyboardType="numeric"
        />

        {/* Reason */}
        <Text style={styles.label}>Reason *</Text>
        <TextInput
          style={styles.input}
          value={reason}
          onChangeText={setReason}
          placeholder="e.g. Goodwill credit for support issue"
          placeholderTextColor="#adb5bd"
        />

        {/* Note (optional) */}
        <Text style={styles.label}>Internal Note (optional)</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={note}
          onChangeText={setNote}
          placeholder="Additional context for the audit log"
          placeholderTextColor="#adb5bd"
          multiline
          numberOfLines={3}
        />

        {/* Error */}
        {error !== '' && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAddCredits}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Add Credits</Text>
          )}
        </TouchableOpacity>

        {/* Success state */}
        {successData && (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Credits Added Successfully</Text>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>User</Text>
              <Text style={styles.successValue}>{successData.userName}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Credits Added</Text>
              <Text style={styles.successValue}>+{successData.amount}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>New Balance</Text>
              <Text style={styles.successValue}>{successData.newBalance} impulses</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Transaction ID</Text>
              <Text style={[styles.successValue, styles.transactionId]}>
                {successData.transactionId}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#1a1a1a',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 12,
  },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#28a745',
    padding: 16,
    marginTop: 24,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#28a745',
    marginBottom: 12,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  successLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  successValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  transactionId: {
    fontSize: 11,
    fontWeight: '400',
    color: '#6c757d',
    maxWidth: '60%',
    textAlign: 'right',
  },
});
