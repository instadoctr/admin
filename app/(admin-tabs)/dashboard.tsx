import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { useState, useEffect } from 'react';
import { adminAPI } from '@/services/api-client';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<{
    newSignups: number;
    pendingProviders: number;
    labBookings: number;
    revenueToday: number;
  } | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getDashboardStats();

      if (response.success && response.data) {
        setDashboardStats(response.data.stats);
      } else {
        setError(response.error || 'Failed to load dashboard stats');
      }
    } catch (err: any) {
      console.error('[Dashboard] Error fetching stats:', err);
      setError(err.message || 'Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      signOut();
      router.replace('/login');
    }
  };

  const stats = [
    {
      id: 1,
      title: 'New Signups (7d)',
      value: loading ? '...' : (dashboardStats?.newSignups.toString() || '0'),
      change: '',
      icon: 'person-add',
      color: '#34C759'
    },
    {
      id: 2,
      title: 'Pending Providers',
      value: loading ? '...' : (dashboardStats?.pendingProviders.toString() || '0'),
      change: '',
      icon: 'medical',
      color: '#FF9500'
    },
    {
      id: 3,
      title: 'Lab Bookings (30d)',
      value: loading ? '...' : (dashboardStats?.labBookings.toString() || '0'),
      change: '',
      icon: 'flask',
      color: '#007AFF'
    },
    {
      id: 4,
      title: 'Revenue Today',
      value: loading ? '...' : (dashboardStats ? `₹${dashboardStats.revenueToday.toLocaleString()}` : '₹0'),
      change: '',
      icon: 'cash',
      color: '#34C759'
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity onPress={fetchDashboardStats}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* User Info and Logout */}
      <View style={styles.userBar}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Admin'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.id} style={styles.statCard}>
            <View style={[styles.iconContainer, { backgroundColor: `${stat.color}20` }]}>
              <Ionicons name={stat.icon as any} size={24} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statTitle}>{stat.title}</Text>
            {stat.change ? (
              <Text style={[styles.statChange, { color: stat.color }]}>{stat.change}</Text>
            ) : null}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
          <Text style={styles.actionText}>Approve Pending Providers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="flask" size={20} color="#007AFF" />
          <Text style={styles.actionText}>View Lab Test Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="close-circle" size={20} color="#007AFF" />
          <Text style={styles.actionText}>Handle Cancellations</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Text style={styles.placeholderText}>Recent notifications will appear here...</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
  },
  userBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 15,
    color: '#1a1a1a',
    marginLeft: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  errorBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#c62828',
  },
  retryText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '600',
    marginLeft: 12,
  },
});
