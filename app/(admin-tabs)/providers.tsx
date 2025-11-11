import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '@/services/api-client';
import { Provider, ProviderDetails } from '@/types/admin.types';

export default function ProvidersScreen() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Modal states
  const [selectedProvider, setSelectedProvider] = useState<ProviderDetails | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await adminAPI.getPendingProviders();

      if (response.success && response.data) {
        setProviders(response.data.providers);
        console.log('[Providers] Loaded', response.data.count, 'pending providers');
      } else {
        setError(response.error || 'Failed to load providers');
      }
    } catch (err: any) {
      console.error('[Providers] Error:', err);
      setError(err.message || 'Failed to load providers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProviders();
  };

  const openProviderDetails = async (provider: Provider) => {
    try {
      setModalVisible(true);
      setModalLoading(true);

      const response = await adminAPI.getProviderDetails(provider.providerId);

      if (response.success && response.data) {
        setSelectedProvider(response.data.provider);
      } else {
        alert('Failed to load provider details');
        setModalVisible(false);
      }
    } catch (err: any) {
      console.error('[Providers] Error loading details:', err);
      alert('Failed to load provider details');
      setModalVisible(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedProvider) return;

    try {
      setActionLoading(true);

      const response = await adminAPI.verifyProvider(selectedProvider.providerId);

      if (response.success) {
        alert('Provider verified successfully!');
        setModalVisible(false);
        fetchProviders(); // Refresh list
      } else {
        alert('Failed to verify provider: ' + response.error);
      }
    } catch (err: any) {
      console.error('[Providers] Verify error:', err);
      alert('Failed to verify provider');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProvider) return;

    const reason = prompt('Rejection reason:');
    if (!reason) return;

    try {
      setActionLoading(true);

      const response = await adminAPI.rejectProvider(selectedProvider.providerId, reason);

      if (response.success) {
        alert('Provider rejected');
        setModalVisible(false);
        fetchProviders(); // Refresh list
      } else {
        alert('Failed to reject provider: ' + response.error);
      }
    } catch (err: any) {
      console.error('[Providers] Reject error:', err);
      alert('Failed to reject provider');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading && providers.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading pending providers...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProviders}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (providers.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="checkmark-circle" size={64} color="#34C759" />
        <Text style={styles.emptyTitle}>All caught up!</Text>
        <Text style={styles.emptySubtitle}>No pending provider applications</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchProviders}>
          <Ionicons name="refresh" size={20} color="#007AFF" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pending Providers ({providers.length})</Text>
        </View>

        {providers.map((provider) => (
          <TouchableOpacity
            key={provider.providerId}
            style={styles.providerCard}
            onPress={() => openProviderDetails(provider)}
          >
            <View style={styles.providerHeader}>
              <View style={styles.providerAvatar}>
                {provider.profilePhotoUrl ? (
                  <Image source={{ uri: provider.profilePhotoUrl }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={32} color="#666" />
                )}
              </View>
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>{provider.name}</Text>
                <Text style={styles.providerType}>
                  {provider.providerType}
                  {provider.specialization ? ` • ${provider.specialization}` : ''}
                </Text>
                <Text style={styles.providerPhone}>{provider.phoneNumber}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>

            <View style={styles.providerFooter}>
              <View style={styles.footerItem}>
                <Ionicons name="document-text" size={16} color="#666" />
                <Text style={styles.footerText}>{provider.documentCount} docs</Text>
              </View>
              <View style={styles.footerItem}>
                <Ionicons name="time" size={16} color="#666" />
                <Text style={styles.footerText}>{formatDate(provider.submittedAt || provider.createdAt)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Provider Details Modal */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          {modalLoading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading provider details...</Text>
            </View>
          ) : selectedProvider ? (
            <>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={28} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Provider Details</Text>
                <View style={{ width: 28 }} />
              </View>

              <ScrollView style={styles.modalContent}>
                {/* Profile Photo */}
                {selectedProvider.profilePhotoSignedUrl && (
                  <View style={styles.modalPhotoContainer}>
                    <Image
                      source={{ uri: selectedProvider.profilePhotoSignedUrl }}
                      style={styles.modalPhoto}
                    />
                  </View>
                )}

                {/* Basic Info */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Basic Information</Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Name:</Text>
                    <Text style={styles.modalValue}>{selectedProvider.name}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Phone:</Text>
                    <Text style={styles.modalValue}>{selectedProvider.phoneNumber}</Text>
                  </View>
                  {selectedProvider.email && (
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Email:</Text>
                      <Text style={styles.modalValue}>{selectedProvider.email}</Text>
                    </View>
                  )}
                </View>

                {/* Professional Info */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Professional Details</Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Type:</Text>
                    <Text style={styles.modalValue}>{selectedProvider.providerType}</Text>
                  </View>
                  {selectedProvider.specialization && (
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Specialization:</Text>
                      <Text style={styles.modalValue}>{selectedProvider.specialization}</Text>
                    </View>
                  )}
                  {selectedProvider.licenseNumber && (
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>License:</Text>
                      <Text style={styles.modalValue}>{selectedProvider.licenseNumber}</Text>
                    </View>
                  )}
                  {selectedProvider.experience && (
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Experience:</Text>
                      <Text style={styles.modalValue}>{selectedProvider.experience} years</Text>
                    </View>
                  )}
                </View>

                {/* Documents */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Documents ({selectedProvider.documents?.length || 0})</Text>
                  {selectedProvider.documents?.map((doc, index) => (
                    <View key={index} style={styles.documentItem}>
                      <Ionicons name="document" size={20} color="#007AFF" />
                      <View style={styles.documentInfo}>
                        <Text style={styles.documentType}>{doc.type}</Text>
                        <Text style={styles.documentFilename}>{doc.filename}</Text>
                      </View>
                      {doc.signedUrl && (
                        <TouchableOpacity onPress={() => Platform.OS === 'web' && window.open(doc.signedUrl, '_blank')}>
                          <Ionicons name="open-outline" size={20} color="#007AFF" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={handleReject}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.verifyButton]}
                  onPress={handleVerify}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Verify</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  providerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  providerType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  providerPhone: {
    fontSize: 13,
    color: '#999',
  },
  providerFooter: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f8f9fa',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    color: '#666',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
  refreshButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  refreshButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalPhotoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  modalLabel: {
    width: 120,
    fontSize: 14,
    color: '#666',
  },
  modalValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  documentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  documentType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  documentFilename: {
    fontSize: 12,
    color: '#666',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
  },
  verifyButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
