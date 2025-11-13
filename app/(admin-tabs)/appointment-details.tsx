import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { adminAPI } from '@/services/api-client';

export default function AppointmentDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const appointmentId = params.appointmentId as string;

  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  // Provider assignment states
  const [providers, setProviders] = useState<any[]>([]);
  const [providerModalVisible, setProviderModalVisible] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [assigningProvider, setAssigningProvider] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(false);

  useEffect(() => {
    if (appointmentId) {
      fetchAppointmentDetails();
    }
  }, [appointmentId]);

  const fetchAppointmentDetails = async () => {
    try {
      setLoading(true);
      setError('');
      // Note: You'll need to add this endpoint to get single appointment
      // For now, fetch all and filter
      const response = await adminAPI.getAppointments();
      if (response.success && response.data) {
        const found = response.data.appointments.find((a: any) => a.appointmentId === appointmentId);
        if (found) {
          setAppointment(found);
        } else {
          setError('Appointment not found');
        }
      } else {
        setError(response.error || 'Failed to load appointment');
      }
    } catch (err: any) {
      console.error('[AppointmentDetails] Error:', err);
      setError(err.message || 'Failed to load appointment');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: '#FF9500',
      pending_assignment: '#FF9500',
      confirmed: '#007AFF',
      'in-progress': '#007AFF',
      completed: '#34C759',
      cancelled: '#FF3B30',
      cancellation_requested: '#FFCC00',
      'no-show': '#8E8E93',
    };
    return colors[status] || '#8E8E93';
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const openStatusModal = () => {
    setNewStatus(appointment.status);
    setModalVisible(true);
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;

    try {
      setUpdating(true);
      const response = await adminAPI.updateAppointmentStatus(appointmentId, newStatus);

      if (response.success) {
        alert('Appointment status updated successfully!');
        setModalVisible(false);
        fetchAppointmentDetails(); // Refresh data
      } else {
        alert('Failed to update status: ' + response.error);
      }
    } catch (err: any) {
      console.error('[AppointmentDetails] Update error:', err);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const fetchProviders = async () => {
    try {
      setLoadingProviders(true);
      const response = await adminAPI.getAllProviders();
      if (response.success && response.data) {
        // Filter to only verified providers
        const verifiedProviders = response.data.providers.filter(
          (p: any) => p.verificationStatus === 'verified'
        );
        setProviders(verifiedProviders);
      } else {
        alert('Failed to load providers: ' + response.error);
      }
    } catch (err: any) {
      console.error('[AppointmentDetails] Provider fetch error:', err);
      alert('Failed to load providers');
    } finally {
      setLoadingProviders(false);
    }
  };

  const openProviderModal = async () => {
    setProviderModalVisible(true);
    if (providers.length === 0) {
      await fetchProviders();
    }
  };

  const handleProviderAssignment = async () => {
    if (!selectedProviderId) {
      alert('Please select a provider');
      return;
    }

    try {
      setAssigningProvider(true);
      const response = await adminAPI.assignProvider(appointmentId, selectedProviderId);

      if (response.success) {
        alert('Provider assigned successfully!');
        setProviderModalVisible(false);
        setSelectedProviderId('');
        fetchAppointmentDetails(); // Refresh data
      } else {
        alert('Failed to assign provider: ' + response.error);
      }
    } catch (err: any) {
      console.error('[AppointmentDetails] Assignment error:', err);
      alert('Failed to assign provider');
    } finally {
      setAssigningProvider(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading appointment details...</Text>
      </View>
    );
  }

  if (error || !appointment) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error || 'Appointment not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
            <Text style={styles.statusText}>{appointment.status}</Text>
          </View>
          <TouchableOpacity style={styles.changeStatusButton} onPress={openStatusModal}>
            <Ionicons name="create-outline" size={18} color="#007AFF" />
            <Text style={styles.changeStatusText}>Change Status</Text>
          </TouchableOpacity>
        </View>

        {/* Appointment ID */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment ID</Text>
          <Text style={styles.appointmentId}>{appointment.appointmentId}</Text>
        </View>

        {/* Patient Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color="#666" />
            <Text style={styles.infoText}>{appointment.patientName || 'Patient'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={20} color="#666" />
            <Text style={styles.infoText}>{appointment.patientPhone || 'N/A'}</Text>
          </View>
          {appointment.bookedBy && appointment.bookedBy !== appointment.patientId && (
            <View style={styles.infoRow}>
              <Ionicons name="people" size={20} color="#666" />
              <Text style={styles.infoText}>Booked by family member</Text>
            </View>
          )}
        </View>

        {/* Provider Assignment (for unassigned appointments) */}
        {appointment.providerId === 'QUICK_BOOK' && (
          <View style={[styles.section, styles.assignmentSection]}>
            <View style={styles.assignmentHeader}>
              <View>
                <Text style={styles.sectionTitle}>⚠️ Unassigned Appointment</Text>
                <Text style={styles.assignmentSubtitle}>This appointment needs a provider to be assigned</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.assignProviderButton} onPress={openProviderModal}>
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.assignProviderButtonText}>Assign Provider</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Provider Information */}
        {appointment.providerId !== 'QUICK_BOOK' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Provider Information</Text>
            <View style={styles.infoRow}>
              <Ionicons name="medical" size={20} color="#666" />
              <Text style={styles.infoText}>{appointment.providerName || 'Provider'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#666" />
              <Text style={styles.infoText}>{appointment.providerType || 'Healthcare Provider'}</Text>
            </View>
            {appointment.assignedAt && (
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                <Text style={styles.infoText}>Assigned: {new Date(appointment.assignedAt).toLocaleString('en-IN')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Appointment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment Details</Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={20} color="#666" />
            <Text style={styles.infoText}>{formatDate(appointment.appointmentDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time" size={20} color="#666" />
            <Text style={styles.infoText}>{appointment.appointmentTime}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="medkit" size={20} color="#666" />
            <Text style={styles.infoText}>{appointment.consultationType || 'Consultation'}</Text>
          </View>
          {appointment.consultationFee && (
            <View style={styles.infoRow}>
              <Ionicons name="cash" size={20} color="#666" />
              <Text style={styles.infoText}>₹{appointment.consultationFee}</Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {appointment.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{appointment.notes}</Text>
          </View>
        )}

        {/* Admin Notes */}
        {appointment.adminNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Notes</Text>
            <Text style={styles.notesText}>{appointment.adminNotes}</Text>
          </View>
        )}

        {/* Timestamps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.infoRow}>
            <Ionicons name="add-circle" size={20} color="#666" />
            <Text style={styles.infoText}>Created: {new Date(appointment.createdAt).toLocaleString('en-IN')}</Text>
          </View>
          {appointment.updatedAt && (
            <View style={styles.infoRow}>
              <Ionicons name="create" size={20} color="#666" />
              <Text style={styles.infoText}>Updated: {new Date(appointment.updatedAt).toLocaleString('en-IN')}</Text>
            </View>
          )}
          {appointment.updatedBy && (
            <View style={styles.infoRow}>
              <Ionicons name="person-circle" size={20} color="#666" />
              <Text style={styles.infoText}>Updated by: {appointment.updatedBy}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Status Update Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Status</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>Select Status:</Text>
              {['pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.statusOption, newStatus === status && styles.statusOptionActive]}
                  onPress={() => setNewStatus(status)}
                >
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
                  <Text style={[styles.statusOptionText, newStatus === status && styles.statusOptionTextActive]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                  {newStatus === status && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.updateButton, updating && styles.updateButtonDisabled]}
                onPress={handleStatusUpdate}
                disabled={updating || newStatus === appointment?.status}
              >
                {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.updateButtonText}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Provider Assignment Modal */}
      <Modal visible={providerModalVisible} animationType="slide" transparent onRequestClose={() => setProviderModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Provider</Text>
              <TouchableOpacity onPress={() => setProviderModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>Select a verified provider:</Text>

              {loadingProviders ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>Loading providers...</Text>
                </View>
              ) : providers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No verified providers found</Text>
                </View>
              ) : (
                <ScrollView style={styles.providersList} showsVerticalScrollIndicator>
                  {providers.map((provider) => (
                    <TouchableOpacity
                      key={provider.providerId}
                      style={[
                        styles.providerOption,
                        selectedProviderId === provider.providerId && styles.providerOptionActive
                      ]}
                      onPress={() => setSelectedProviderId(provider.providerId)}
                    >
                      <View style={styles.providerInfo}>
                        <Text style={[
                          styles.providerName,
                          selectedProviderId === provider.providerId && styles.providerNameActive
                        ]}>
                          {provider.name}
                        </Text>
                        <Text style={styles.providerType}>
                          {provider.providerType} {provider.specialization ? `• ${provider.specialization}` : ''}
                        </Text>
                      </View>
                      <View style={styles.providerBadges}>
                        <View style={[
                          styles.availabilityBadge,
                          provider.isAvailable === 1 ? styles.availableBadge : styles.unavailableBadge
                        ]}>
                          <Text style={styles.availabilityText}>
                            {provider.isAvailable === 1 ? 'Available' : 'Unavailable'}
                          </Text>
                        </View>
                        {selectedProviderId === provider.providerId && (
                          <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setProviderModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.updateButton, (assigningProvider || !selectedProviderId) && styles.updateButtonDisabled]}
                onPress={handleProviderAssignment}
                disabled={assigningProvider || !selectedProviderId}
              >
                {assigningProvider ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.updateButtonText}>Assign</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerContainer: { flex: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  backIcon: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  content: { padding: 16 },
  statusContainer: { alignItems: 'center', marginBottom: 24 },
  statusBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  statusText: { fontSize: 14, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 1 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  appointmentId: { fontSize: 14, color: '#666', fontFamily: 'monospace' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  infoText: { fontSize: 15, color: '#1a1a1a', flex: 1 },
  notesText: { fontSize: 14, color: '#666', lineHeight: 20 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  errorText: { marginTop: 12, fontSize: 16, color: '#FF3B30', textAlign: 'center' },
  backButton: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#007AFF', borderRadius: 8 },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  changeStatusButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f0f8ff', borderRadius: 8, borderWidth: 1, borderColor: '#007AFF' },
  changeStatusText: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '90%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  modalContent: { padding: 16 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  statusOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e9ecef', marginTop: 8, backgroundColor: '#fff' },
  statusOptionActive: { borderColor: '#007AFF', backgroundColor: '#f0f8ff' },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  statusOptionText: { flex: 1, fontSize: 14, color: '#1a1a1a' },
  statusOptionTextActive: { fontWeight: '600', color: '#007AFF' },
  modalActions: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#e9ecef' },
  cancelButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#e9ecef' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
  updateButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#007AFF' },
  updateButtonDisabled: { opacity: 0.5 },
  updateButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  // Provider assignment styles
  assignmentSection: { borderColor: '#FF9500', borderWidth: 2, backgroundColor: '#FFF9F0' },
  assignmentHeader: { marginBottom: 12 },
  assignmentSubtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  assignProviderButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#007AFF', paddingVertical: 12, borderRadius: 8 },
  assignProviderButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  providersList: { maxHeight: 400 },
  providerOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e9ecef', marginTop: 8, backgroundColor: '#fff' },
  providerOptionActive: { borderColor: '#007AFF', backgroundColor: '#f0f8ff' },
  providerInfo: { flex: 1, marginRight: 12 },
  providerName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  providerNameActive: { color: '#007AFF' },
  providerType: { fontSize: 13, color: '#666' },
  providerBadges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  availabilityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  availableBadge: { backgroundColor: '#E8F5E9' },
  unavailableBadge: { backgroundColor: '#FFEBEE' },
  availabilityText: { fontSize: 11, fontWeight: '600' },
  loadingContainer: { alignItems: 'center', padding: 32 },
  emptyContainer: { alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center' },
});
