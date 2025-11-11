import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { adminAPI } from '@/services/api-client';

export default function LabTestsScreen() {
  const router = useRouter();
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchLabOrders();
  }, [statusFilter]);

  const fetchLabOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getLabOrders(statusFilter || undefined);
      if (response.success && response.data) {
        setLabOrders(response.data.labOrders);
        console.log('[LabTests] Loaded', response.data.count, 'orders');
      } else {
        setError(response.error || 'Failed to load lab orders');
      }
    } catch (err: any) {
      console.error('[LabTests] Error:', err);
      setError(err.message || 'Failed to load lab orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openStatusModal = (order: any) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setModalVisible(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return;
    try {
      setUpdating(true);
      const response = await adminAPI.updateLabOrderStatus(selectedOrder.orderId, newStatus);
      if (response.success) {
        alert('Lab order status updated successfully!');
        setModalVisible(false);
        setSelectedOrder(null);
        fetchLabOrders();
      } else {
        alert('Failed to update status: ' + response.error);
      }
    } catch (err: any) {
      console.error('[LabTests] Update error:', err);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = { pending: '#FF9500', confirmed: '#007AFF', sample_collected: '#5AC8FA', processing: '#FF9500', completed: '#34C759', cancelled: '#FF3B30' };
    return colors[status] || '#8E8E93';
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading && labOrders.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading lab orders...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchLabOrders}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLabOrders(); }} />}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Lab Orders ({labOrders.length})</Text>
        </View>

        <View style={styles.filterContainer}>
          {['', 'pending', 'confirmed', 'sample_collected', 'processing', 'completed'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterButton, statusFilter === status && styles.filterButtonActive]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>
                {status === '' ? 'All' : status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {labOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="flask-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No lab orders</Text>
          </View>
        ) : (
          labOrders.map((order) => (
            <TouchableOpacity
              key={order.orderId}
              style={styles.orderCard}
              onPress={() => router.push(`/lab-order-details?orderId=${order.orderId}`)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.orderName}>{order.testNames?.join(', ') || 'Lab Test'}</Text>
                  <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    openStatusModal(order);
                  }}
                >
                  <Text style={styles.statusText}>{order.status?.replace(/_/g, ' ')}</Text>
                  <Ionicons name="create-outline" size={14} color="#fff" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="cash" size={16} color="#666" />
                  <Text style={styles.detailText}>₹{order.totalAmount || 0}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="person" size={16} color="#666" />
                  <Text style={styles.detailText}>{order.userName || 'User'}</Text>
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
                disabled={updating || newStatus === selectedOrder?.status}
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
  filterContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', gap: 8, borderBottomWidth: 1, borderBottomColor: '#e9ecef', flexWrap: 'wrap' },
  filterButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#e9ecef', backgroundColor: '#fff' },
  filterButtonActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  filterText: { fontSize: 13, color: '#666', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  orderCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardHeaderLeft: { flex: 1 },
  orderName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  orderDate: { fontSize: 14, color: '#666' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#fff', textTransform: 'capitalize' },
  cardDetails: { gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: '#666' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginTop: 16 },
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
