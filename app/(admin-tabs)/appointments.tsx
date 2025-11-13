import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { adminAPI } from '@/services/api-client';

export default function AppointmentsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

  // Status update modal
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter]);

  useEffect(() => {
    applyFilters();
  }, [appointments, showUnassignedOnly]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await adminAPI.getAppointments(statusFilter || undefined);

      if (response.success && response.data) {
        setAppointments(response.data.appointments);
        console.log('[Appointments] Loaded', response.data.count, 'appointments');
      } else {
        setError(response.error || 'Failed to load appointments');
      }
    } catch (err: any) {
      console.error('[Appointments] Error:', err);
      setError(err.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...appointments];

    // Filter for unassigned appointments (providerId === 'QUICK_BOOK')
    if (showUnassignedOnly) {
      filtered = filtered.filter(apt => apt.providerId === 'QUICK_BOOK');
    }

    setFilteredAppointments(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const toggleUnassignedFilter = () => {
    setShowUnassignedOnly(!showUnassignedOnly);
    // Reset status filter when showing unassigned
    if (!showUnassignedOnly) {
      setStatusFilter('');
    }
  };

  const openStatusModal = (appointment: any) => {
    setSelectedAppointment(appointment);
    setNewStatus(appointment.status);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedAppointment(null);
    setNewStatus('');
  };

  const handleStatusUpdate = async () => {
    if (!selectedAppointment || !newStatus) return;

    try {
      setUpdating(true);

      const response = await adminAPI.updateAppointmentStatus(
        selectedAppointment.appointmentId,
        newStatus
      );

      if (response.success) {
        alert('Appointment status updated successfully!');
        closeModal();
        fetchAppointments();
      } else {
        alert('Failed to update status: ' + response.error);
      }
    } catch (err: any) {
      console.error('[Appointments] Update error:', err);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'pending_assignment': return '#FF9500';
      case 'confirmed': return '#007AFF';
      case 'in-progress': return '#007AFF';
      case 'completed': return '#34C759';
      case 'cancelled': return '#FF3B30';
      case 'cancellation_requested': return '#FFCC00';
      case 'no-show': return '#8E8E93';
      default: return '#8E8E93';
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

  if (loading && filteredAppointments.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading appointments...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAppointments}>
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
          <Text style={styles.headerTitle}>Appointments ({filteredAppointments.length})</Text>
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === '' && !showUnassignedOnly && styles.filterButtonActive]}
            onPress={() => {
              setStatusFilter('');
              setShowUnassignedOnly(false);
            }}
          >
            <Text style={[styles.filterText, statusFilter === '' && !showUnassignedOnly && styles.filterTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, showUnassignedOnly && styles.unassignedFilterActive]}
            onPress={toggleUnassignedFilter}
          >
            <Ionicons
              name="alert-circle"
              size={14}
              color={showUnassignedOnly ? '#fff' : '#FF9500'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filterText, showUnassignedOnly && styles.filterTextActive]}>Unassigned</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === 'pending' && !showUnassignedOnly && styles.filterButtonActive]}
            onPress={() => {
              setStatusFilter('pending');
              setShowUnassignedOnly(false);
            }}
          >
            <Text style={[styles.filterText, statusFilter === 'pending' && !showUnassignedOnly && styles.filterTextActive]}>Pending</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === 'confirmed' && !showUnassignedOnly && styles.filterButtonActive]}
            onPress={() => {
              setStatusFilter('confirmed');
              setShowUnassignedOnly(false);
            }}
          >
            <Text style={[styles.filterText, statusFilter === 'confirmed' && !showUnassignedOnly && styles.filterTextActive]}>Confirmed</Text>
          </TouchableOpacity>
        </View>

        {filteredAppointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No appointments</Text>
            <Text style={styles.emptySubtitle}>No appointments found for this filter</Text>
          </View>
        ) : (
          filteredAppointments.map((appointment) => (
            <TouchableOpacity
              key={appointment.appointmentId}
              style={[
                styles.appointmentCard,
                appointment.providerId === 'QUICK_BOOK' && styles.unassignedCard
              ]}
              onPress={() => router.push(`/appointment-details?appointmentId=${appointment.appointmentId}`)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.patientRow}>
                    <Text style={styles.patientName}>{appointment.patientName || 'Patient'}</Text>
                    {appointment.providerId === 'QUICK_BOOK' && (
                      <View style={styles.unassignedBadge}>
                        <Ionicons name="alert-circle" size={12} color="#FF9500" />
                        <Text style={styles.unassignedText}>Unassigned</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.providerName}>
                    {appointment.providerId === 'QUICK_BOOK'
                      ? 'No provider assigned'
                      : (appointment.providerName || 'Provider')
                    }
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    openStatusModal(appointment);
                  }}
                >
                  <Text style={styles.statusText}>{appointment.status}</Text>
                  <Ionicons name="create-outline" size={14} color="#fff" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar" size={16} color="#666" />
                  <Text style={styles.detailText}>{formatDate(appointment.appointmentDate)} at {appointment.appointmentTime}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="medkit" size={16} color="#666" />
                  <Text style={styles.detailText}>{appointment.consultationType || 'Consultation'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="chevron-forward" size={16} color="#007AFF" />
                  <Text style={[styles.detailText, { color: '#007AFF' }]}>Tap to view details</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Status</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>Select Status:</Text>
              {['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'].map((status) => (
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
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.updateButton, updating && styles.updateButtonDisabled]}
                onPress={handleStatusUpdate}
                disabled={updating || newStatus === selectedAppointment?.status}
              >
                {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.updateButtonText}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerContainer: { flex: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center', padding: 20 },
  scrollView: { flex: 1 },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  filterContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', gap: 8, borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  filterButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef', backgroundColor: '#fff' },
  filterButtonActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  unassignedFilterActive: { backgroundColor: '#FF9500', borderColor: '#FF9500' },
  filterText: { fontSize: 13, color: '#666', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  appointmentCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  unassignedCard: { borderColor: '#FF9500', borderWidth: 2, backgroundColor: '#FFF9F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardHeaderLeft: { flex: 1 },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  patientName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  unassignedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#FFF3E0', borderRadius: 8 },
  unassignedText: { fontSize: 10, fontWeight: '600', color: '#FF9500' },
  providerName: { fontSize: 14, color: '#666' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#fff', textTransform: 'capitalize' },
  cardDetails: { gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: '#666' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#666', marginTop: 8 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  errorText: { marginTop: 12, fontSize: 16, color: '#FF3B30', textAlign: 'center' },
  retryButton: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#007AFF', borderRadius: 8 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
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
});
