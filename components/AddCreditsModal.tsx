import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '@/services/api-client';

interface AddCreditsModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

interface SuccessData {
  userName: string;
  amount: number;
  newBalance: number;
  transactionId: string;
}

export default function AddCreditsModal({ visible, onClose, userId, userName }: AddCreditsModalProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  // Reset form state whenever modal opens
  useEffect(() => {
    if (visible) {
      setAmount('');
      setReason('');
      setNote('');
      setError('');
      setSuccessData(null);
    }
  }, [visible]);

  const handleSubmit = async () => {
    setError('');

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
        userId,
        parsedAmount,
        reason.trim(),
        note.trim() || undefined
      );

      if (response.success && response.data) {
        const data = response.data as any;
        const result: SuccessData = {
          userName: data.user?.name || userName,
          amount: parsedAmount,
          newBalance: data.wallet?.balance ?? 0,
          transactionId: data.transaction?.transactionId || '',
        };
        setSuccessData(result);
        console.log('[AddCreditsModal] Credits added for', userId, '+', parsedAmount);

        // Auto-close after 3 seconds on success
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setError((response as any).error || (response as any).message || 'Failed to add credits.');
      }
    } catch (err: any) {
      console.error('[AddCreditsModal] Error:', err);
      setError(err.message || 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerClose}>
            <Ionicons name="close" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Credits</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Target user info */}
          <View style={styles.userInfoRow}>
            <Ionicons name="person-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.userInfoText} numberOfLines={1}>{userName || userId}</Text>
          </View>

          {successData ? (
            /* Success card */
            <View style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={40} color="#34C759" style={styles.successIcon} />
              <Text style={styles.successTitle}>Credits Added</Text>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>User</Text>
                <Text style={styles.successValue}>{successData.userName}</Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Credits Added</Text>
                <Text style={[styles.successValue, styles.successAmount]}>+{successData.amount}</Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>New Balance</Text>
                <Text style={styles.successValue}>{successData.newBalance} credits</Text>
              </View>
              <View style={[styles.successRow, styles.successRowLast]}>
                <Text style={styles.successLabel}>Transaction ID</Text>
                <Text style={[styles.successValue, styles.transactionId]} numberOfLines={2}>
                  {successData.transactionId}
                </Text>
              </View>
              <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
              <Text style={styles.autoCloseHint}>Closes automatically in 3s</Text>
            </View>
          ) : (
            /* Form */
            <>
              {/* Amount */}
              <Text style={styles.label}>Amount (credits) *</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g. 100"
                placeholderTextColor="#adb5bd"
                keyboardType="numeric"
                returnKeyType="next"
              />

              {/* Reason */}
              <Text style={styles.label}>Reason *</Text>
              <TextInput
                style={styles.input}
                value={reason}
                onChangeText={setReason}
                placeholder="e.g. Goodwill credit for support issue"
                placeholderTextColor="#adb5bd"
                returnKeyType="next"
              />

              {/* Note */}
              <Text style={styles.label}>Internal Note (optional)</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={note}
                onChangeText={setNote}
                placeholder="Additional context for the audit log"
                placeholderTextColor="#adb5bd"
                multiline
                numberOfLines={3}
                returnKeyType="done"
              />

              {/* Error */}
              {error !== '' && (
                <Text style={styles.errorText}>{error}</Text>
              )}

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Add Credits</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerClose: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF10',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#007AFF30',
  },
  userInfoText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
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
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 12,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Success card
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#34C75940',
    padding: 20,
    marginTop: 8,
    alignItems: 'stretch',
  },
  successIcon: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34C759',
    textAlign: 'center',
    marginBottom: 20,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  successRowLast: {
    borderBottomWidth: 0,
  },
  successLabel: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
  },
  successValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'right',
  },
  successAmount: {
    color: '#34C759',
  },
  transactionId: {
    fontSize: 11,
    fontWeight: '400',
    color: '#6c757d',
  },
  doneButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  autoCloseHint: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    color: '#adb5bd',
  },
});
