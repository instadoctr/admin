import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { adminAPI } from '@/services/api-client';

export default function LabOrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getLabOrders();
      if (response.success && response.data) {
        const found = response.data.labOrders.find((o: any) => o.orderId === orderId);
        if (found) {
          setOrder(found);
        } else {
          setError('Lab order not found');
        }
      } else {
        setError(response.error || 'Failed to load lab order');
      }
    } catch (err: any) {
      console.error('[LabOrderDetails] Error:', err);
      setError(err.message || 'Failed to load lab order');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: '#FF9500',
      confirmed: '#007AFF',
      sample_collected: '#5AC8FA',
      processing: '#FF9500',
      completed: '#34C759',
      cancelled: '#FF3B30',
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
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const openStatusModal = () => {
    setNewStatus(order.status);
    setModalVisible(true);
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;

    try {
      setUpdating(true);
      const response = await adminAPI.updateLabOrderStatus(orderId, newStatus);

      if (response.success) {
        alert('Lab order status updated successfully!');
        setModalVisible(false);
        fetchOrderDetails(); // Refresh data
      } else {
        alert('Failed to update status: ' + response.error);
      }
    } catch (err: any) {
      console.error('[LabOrderDetails] Update error:', err);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error || 'Lab order not found'}</Text>
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
        <Text style={styles.headerTitle}>Lab Order Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={styles.statusText}>{order.status?.replace(/_/g, ' ')}</Text>
          </View>
          <TouchableOpacity style={styles.changeStatusButton} onPress={openStatusModal}>
            <Ionicons name="create-outline" size={18} color="#007AFF" />
            <Text style={styles.changeStatusText}>Change Status</Text>
          </TouchableOpacity>
        </View>

        {/* Order ID */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order ID</Text>
          <Text style={styles.orderId}>{order.orderId}</Text>
        </View>

        {/* Patient Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color="#666" />
            <Text style={styles.infoText}>{order.userName || 'User'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={20} color="#666" />
            <Text style={styles.infoText}>{order.userPhone || 'N/A'}</Text>
          </View>
          {order.patientName && order.patientName !== order.userName && (
            <View style={styles.infoRow}>
              <Ionicons name="people" size={20} color="#666" />
              <Text style={styles.infoText}>For: {order.patientName}</Text>
            </View>
          )}
        </View>

        {/* Tests Ordered */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tests Ordered</Text>
          {order.testNames?.map((testName: string, index: number) => (
            <View key={index} style={styles.testItem}>
              <Ionicons name="flask" size={18} color="#007AFF" />
              <Text style={styles.testName}>{testName}</Text>
            </View>
          )) || <Text style={styles.infoText}>No test details available</Text>}
        </View>

        {/* Collection Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Collection Details</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color="#666" />
            <Text style={styles.infoText}>{order.collectionType === 'home' ? 'Home Collection' : 'Lab Visit'}</Text>
          </View>
          {order.preferredDate && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={20} color="#666" />
              <Text style={styles.infoText}>Preferred: {formatDate(order.preferredDate)}</Text>
            </View>
          )}
          {order.address && (
            <View style={styles.infoRow}>
              <Ionicons name="home" size={20} color="#666" />
              <Text style={styles.infoText}>{order.address}</Text>
            </View>
          )}
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="cash" size={20} color="#666" />
            <Text style={styles.infoText}>Total Amount: ₹{order.totalAmount || 0}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="card" size={20} color="#666" />
            <Text style={styles.infoText}>Payment Status: {order.paymentStatus || 'Pending'}</Text>
          </View>
        </View>

        {/* Admin Notes */}
        {order.adminNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Notes</Text>
            <Text style={styles.notesText}>{order.adminNotes}</Text>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.infoRow}>
            <Ionicons name="add-circle" size={20} color="#666" />
            <Text style={styles.infoText}>Ordered: {formatDate(order.createdAt)}</Text>
          </View>
          {order.updatedAt && (
            <View style={styles.infoRow}>
              <Ionicons name="create" size={20} color="#666" />
              <Text style={styles.infoText}>Updated: {formatDate(order.updatedAt)}</Text>
            </View>
          )}
          {order.updatedBy && (
            <View style={styles.infoRow}>
              <Ionicons name="person-circle" size={20} color="#666" />
              <Text style={styles.infoText}>Updated by: {order.updatedBy}</Text>
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
              {['pending', 'confirmed', 'sample_collected', 'processing', 'completed', 'cancelled'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.statusOption, newStatus === status && styles.statusOptionActive]}
                  onPress={() => setNewStatus(status)}
                >
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
                  <Text style={[styles.statusOptionText, newStatus === status && styles.statusOptionTextActive]}>
                    {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
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
                disabled={updating || newStatus === order?.status}
              >
                {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.updateButtonText}>Update</Text>}
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
  orderId: { fontSize: 14, color: '#666', fontFamily: 'monospace' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  infoText: { fontSize: 15, color: '#1a1a1a', flex: 1 },
  testItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#f8f9fa', borderRadius: 8 },
  testName: { fontSize: 15, color: '#1a1a1a', fontWeight: '500', flex: 1 },
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
});
