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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { adminAPI } from '@/services/api-client';
import { Provider, ProviderDetails } from '@/types/admin.types';

export default function ProvidersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [verifiedProviders, setVerifiedProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifiedLoading, setVerifiedLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Modal states
  const [selectedProvider, setSelectedProvider] = useState<ProviderDetails | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedDocumentUrl, setSelectedDocumentUrl] = useState<string | null>(null);
  const [documentViewerVisible, setDocumentViewerVisible] = useState(false);

  useEffect(() => {
    fetchProviders();
    fetchVerifiedProviders();
  }, []);

  // Open provider details from URL parameter
  useEffect(() => {
    const providerId = params.providerId as string;
    if (providerId && providers.length > 0) {
      const provider = providers.find(p => p.providerId === providerId);
      if (provider) {
        openProviderDetails(provider);
      }
    }
  }, [params.providerId, providers]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await adminAPI.getPendingProviders();

      if (response.success && response.data) {
        // Ensure providers is an array and clean the data
        const providersData = Array.isArray(response.data.providers) ? response.data.providers : [];

        // Clean each provider object to ensure all fields are primitives
        const cleanProviders = providersData.map((p: any) => ({
          providerId: String(p.providerId || ''),
          userId: String(p.userId || ''),
          name: String(p.name || ''),
          phoneNumber: String(p.phoneNumber || ''),
          providerType: String(p.providerType || ''),
          specialization: p.specialization ? String(p.specialization) : undefined,
          licenseNumber: p.licenseNumber ? String(p.licenseNumber) : undefined,
          documentCount: Number(p.documentCount || 0),
          profilePhotoUrl: p.profilePhotoUrl ? String(p.profilePhotoUrl) : undefined,
          verificationStatus: p.verificationStatus || 'pending',
          submittedAt: p.submittedAt ? String(p.submittedAt) : undefined,
          createdAt: String(p.createdAt || ''),
        }));

        setProviders(cleanProviders);
        console.log('[Providers] Loaded', cleanProviders.length, 'pending providers');
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

  const fetchVerifiedProviders = async () => {
    try {
      setVerifiedLoading(true);

      const response = await adminAPI.getAllProviders('verified');

      if (response.success && response.data) {
        const providersData = Array.isArray(response.data.providers) ? response.data.providers : [];

        const cleanProviders = providersData.map((p: any) => ({
          providerId: String(p.providerId || ''),
          userId: String(p.userId || ''),
          name: String(p.name || ''),
          phoneNumber: String(p.phoneNumber || ''),
          providerType: String(p.providerType || ''),
          specialization: p.specialization ? String(p.specialization) : undefined,
          licenseNumber: p.licenseNumber ? String(p.licenseNumber) : undefined,
          documentCount: Number(p.documentCount || 0),
          profilePhotoUrl: p.profilePhotoUrl ? String(p.profilePhotoUrl) : undefined,
          verificationStatus: p.verificationStatus || 'verified',
          submittedAt: p.submittedAt ? String(p.submittedAt) : undefined,
          createdAt: String(p.createdAt || ''),
          verifiedAt: p.verifiedAt ? String(p.verifiedAt) : undefined,
          verifiedBy: p.verifiedBy ? String(p.verifiedBy) : undefined,
        }));

        setVerifiedProviders(cleanProviders);
        console.log('[Providers] Loaded', cleanProviders.length, 'verified providers');
      }
    } catch (err: any) {
      console.error('[Providers] Error fetching verified:', err);
    } finally {
      setVerifiedLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProviders();
    fetchVerifiedProviders();
  };

  const openProviderDetails = async (provider: Provider) => {
    try {
      // Update URL with providerId
      router.setParams({ providerId: provider.providerId });

      setModalVisible(true);
      setModalLoading(true);

      const response = await adminAPI.getProviderDetails(provider.providerId);

      if (response.success && response.data) {
        const p = response.data.provider;

        // Clean the provider data to ensure no nested objects are rendered as children
        const cleanProvider = {
          ...p,
          name: String(p.name || ''),
          phoneNumber: String(p.phoneNumber || ''),
          email: p.email ? String(p.email) : undefined,
          providerType: String(p.providerType || ''),
          specialization: p.specialization ? String(p.specialization) : undefined,
          experience: p.experience ? Number(p.experience) : undefined,
          licenseNumber: p.licenseNumber ? String(p.licenseNumber) : undefined,
          qualification: p.qualification ? String(p.qualification) : undefined,
          profilePhotoUrl: p.profilePhotoUrl ? String(p.profilePhotoUrl) : undefined,
          profilePhotoSignedUrl: p.profilePhotoSignedUrl ? String(p.profilePhotoSignedUrl) : undefined,
          // Ensure documents is an array
          documents: Array.isArray(p.documents) ? p.documents : [],
        };

        console.log('[Providers] Loaded details for', cleanProvider.providerId, 'with', cleanProvider.documents.length, 'documents');
        setSelectedProvider(cleanProvider);
      } else {
        alert('Failed to load provider details');
        setModalVisible(false);
        router.setParams({ providerId: undefined });
      }
    } catch (err: any) {
      console.error('[Providers] Error loading details:', err);
      alert('Failed to load provider details');
      setModalVisible(false);
      router.setParams({ providerId: undefined });
    } finally {
      setModalLoading(false);
    }
  };

  const closeProviderModal = () => {
    setModalVisible(false);
    setSelectedProvider(null);
    // Clear providerId from URL
    router.setParams({ providerId: undefined });
  };

  const handleVerify = async () => {
    if (!selectedProvider) return;

    try {
      setActionLoading(true);

      const response = await adminAPI.verifyProvider(selectedProvider.providerId);

      if (response.success) {
        alert('Provider verified successfully!');
        closeProviderModal();
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
        closeProviderModal();
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

  const openDocumentViewer = (url: string) => {
    setSelectedDocumentUrl(url);
    setDocumentViewerVisible(true);
  };

  const closeDocumentViewer = () => {
    setDocumentViewerVisible(false);
    setSelectedDocumentUrl(null);
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

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pending Providers ({providers.length})</Text>
        </View>

        {providers.length === 0 ? (
          <View style={styles.emptyPendingContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#34C759" />
            <Text style={styles.emptyPendingTitle}>All caught up!</Text>
            <Text style={styles.emptyPendingText}>No pending provider applications</Text>
          </View>
        ) : (
          providers.map((provider) => (
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
          ))
        )}

        {/* Verified Providers Section */}
        <View style={styles.verifiedSection}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Verified Providers ({verifiedProviders.length})</Text>
          </View>

          {verifiedLoading && verifiedProviders.length === 0 ? (
            <View style={styles.sectionLoading}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>Loading verified providers...</Text>
            </View>
          ) : verifiedProviders.length === 0 ? (
            <View style={styles.emptyVerifiedContainer}>
              <Text style={styles.emptyVerifiedText}>No verified providers yet</Text>
            </View>
          ) : (
            verifiedProviders.map((provider) => (
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
                    <View style={styles.nameWithBadge}>
                      <Text style={styles.providerName}>{provider.name}</Text>
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                        <Text style={styles.verifiedBadgeText}>Verified</Text>
                      </View>
                    </View>
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
                  {provider.verifiedAt && (
                    <View style={styles.footerItem}>
                      <Ionicons name="shield-checkmark" size={16} color="#34C759" />
                      <Text style={styles.footerText}>Verified {formatDate(provider.verifiedAt)}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Provider Details Modal */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={closeProviderModal}>
        <View style={styles.modalContainer}>
          {modalLoading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading provider details...</Text>
            </View>
          ) : selectedProvider ? (
            <>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={closeProviderModal}>
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
                  <Text style={styles.modalSectionTitle}>
                    Documents ({Array.isArray(selectedProvider.documents) ? selectedProvider.documents.length : 0})
                  </Text>
                  {Array.isArray(selectedProvider.documents) && selectedProvider.documents.length > 0 ? (
                    selectedProvider.documents.map((doc: any, index: number) => {
                      // Handle both old format (documentType, fileName) and new format (type, filename)
                      const docType = String(doc.type || doc.documentType || 'Document');
                      const docFilename = String(doc.filename || doc.fileName || 'File');
                      const docUrl = doc.signedUrl || null;

                      return (
                        <TouchableOpacity
                          key={index}
                          style={styles.documentItem}
                          onPress={() => docUrl && openDocumentViewer(docUrl)}
                          disabled={!docUrl}
                        >
                          <Ionicons name="document" size={20} color="#007AFF" />
                          <View style={styles.documentInfo}>
                            <Text style={styles.documentType}>{docType}</Text>
                            <Text style={styles.documentFilename}>{docFilename}</Text>
                          </View>
                          {docUrl && <Ionicons name="chevron-forward" size={20} color="#007AFF" />}
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyText}>No documents uploaded</Text>
                  )}
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

      {/* Document Viewer Modal */}
      <Modal
        visible={documentViewerVisible}
        animationType="fade"
        onRequestClose={closeDocumentViewer}
        transparent={true}
      >
        <View style={styles.documentViewerOverlay}>
          <View style={styles.documentViewerContainer}>
            <View style={styles.documentViewerHeader}>
              <Text style={styles.documentViewerTitle}>Document Preview</Text>
              <TouchableOpacity onPress={closeDocumentViewer} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.documentViewerContent}>
              {selectedDocumentUrl && (
                <Image
                  source={{ uri: selectedDocumentUrl }}
                  style={styles.documentImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </View>
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
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
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
  // Document Viewer Styles
  documentViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentViewerContainer: {
    width: '90%',
    height: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  documentViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
  },
  documentViewerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  documentViewerContent: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentImage: {
    width: '100%',
    height: '100%',
  },
  verifiedSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  sectionLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyVerifiedContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyVerifiedText: {
    fontSize: 14,
    color: '#999',
  },
  nameWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C75915',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34C759',
    marginLeft: 4,
  },
  emptyPendingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  emptyPendingTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  emptyPendingText: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },
});
