import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { adminAPI } from '@/services/api-client';
import { ActivityUser, ActivityEventPreview } from '@/types/admin.types';
import AddCreditsModal from '@/components/AddCreditsModal';

type SortKey = 'last_active' | 'name_asc' | 'name_desc' | 'signup_newest' | 'signup_oldest';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'last_active', label: 'Last Active' },
  { key: 'name_asc', label: 'Name A–Z' },
  { key: 'name_desc', label: 'Name Z–A' },
  { key: 'signup_newest', label: 'Newest' },
  { key: 'signup_oldest', label: 'Oldest' },
];

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return isoString;
  }
}

function getEventTypeLabel(eventType: string): string {
  const labels: Record<string, string> = {
    screen_view: 'Viewed screen',
    button_click: 'Tapped button',
    tab_open: 'Opened tab',
    booking: 'Made booking',
    login: 'Logged in',
    profile_update: 'Updated profile',
    app_open: 'Opened app',
    app_background: 'Left app',
  };
  return labels[eventType] || eventType;
}

function getEventTypeColor(eventType: string): string {
  const colors: Record<string, string> = {
    screen_view: '#007AFF',
    button_click: '#5856D6',
    booking: '#34C759',
    login: '#FF9500',
    profile_update: '#AF52DE',
    app_open: '#8E8E93',
    app_background: '#8E8E93',
  };
  return colors[eventType] || '#666';
}

export default function UserActivityScreen() {
  const router = useRouter();

  const [users, setUsers] = useState<ActivityUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('last_active');

  const [creditModalVisible, setCreditModalVisible] = useState(false);
  const [creditModalUserId, setCreditModalUserId] = useState('');
  const [creditModalUserName, setCreditModalUserName] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const response = await adminAPI.getActivityUsers({
        search: searchQuery || undefined,
        limit: 20,
      });

      if (response.success && response.data) {
        const data = response.data as any;
        const fetchedUsers = Array.isArray(data.users) ? data.users : [];
        setUsers(fetchedUsers);
        setLastKey(data.lastEvaluatedKey || null);
        setHasMore(!!data.lastEvaluatedKey);
        console.log('[UserActivity] Loaded', fetchedUsers.length, 'users');
      } else {
        setError(response.error || 'Failed to load users');
      }
    } catch (err: any) {
      console.error('[UserActivity] Error:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || !lastKey) return;

    try {
      setLoadingMore(true);

      const response = await adminAPI.getActivityUsers({
        search: searchQuery || undefined,
        limit: 20,
        lastKey: JSON.stringify(lastKey),
      });

      if (response.success && response.data) {
        const data = response.data as any;
        const moreUsers = Array.isArray(data.users) ? data.users : [];
        setUsers(prev => [...prev, ...moreUsers]);
        setLastKey(data.lastEvaluatedKey || null);
        setHasMore(!!data.lastEvaluatedKey);
      }
    } catch (err: any) {
      console.error('[UserActivity] Load more error:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSearch = () => {
    setUsers([]);
    setLastKey(null);
    setHasMore(false);
    fetchUsers();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setUsers([]);
    setLastKey(null);
    setHasMore(false);
  };

  const onRefresh = () => {
    fetchUsers(true);
  };

  const isRecentlyActive = (isoString?: string): boolean => {
    if (!isoString) return false;
    const diffMs = new Date().getTime() - new Date(isoString).getTime();
    return diffMs < 3600000; // within last hour
  };

  const sortedUsers = useMemo(() => {
    const copy = [...users];
    switch (sortKey) {
      case 'last_active':
        return copy.sort((a, b) => {
          if (!a.lastActivityAt && !b.lastActivityAt) return 0;
          if (!a.lastActivityAt) return 1;
          if (!b.lastActivityAt) return -1;
          return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
        });
      case 'name_asc':
        return copy.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      case 'name_desc':
        return copy.sort((a, b) => b.name.toLowerCase().localeCompare(a.name.toLowerCase()));
      case 'signup_newest':
        return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'signup_oldest':
        return copy.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      default:
        return copy;
    }
  }, [users, sortKey]);

  if (loading && users.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchUsers()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputRow}>
          <Ionicons name="search" size={18} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={18} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sort Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sortScrollView}
        contentContainerStyle={styles.sortScrollContent}
      >
        {SORT_OPTIONS.map(({ key, label }) => {
          const isActive = sortKey === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.sortChip, isActive && styles.sortChipActive]}
              onPress={() => setSortKey(key)}
            >
              <Text style={[styles.sortChipText, isActive && styles.sortChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {sortedUsers.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No users found</Text>
            {searchQuery.length > 0 && (
              <Text style={styles.emptySubtitle}>Try a different search</Text>
            )}
          </View>
        ) : (
          sortedUsers.map((user) => (
            <TouchableOpacity
              key={user.userId}
              style={styles.userCard}
              onPress={() =>
                router.push({
                  pathname: '/(admin-tabs)/user-activity-details',
                  params: { userId: user.userId },
                })
              }
            >
              {/* Row 1: Name + last active */}
              <View style={styles.cardRow}>
                <Text style={styles.userName}>{user.name}</Text>
                <View style={styles.lastActiveRow}>
                  {isRecentlyActive(user.lastActivityAt) && (
                    <Ionicons name="ellipse" size={8} color="#34C759" style={styles.activeDot} />
                  )}
                  <Text style={styles.lastActiveText}>
                    {user.lastActivityAt ? formatRelativeTime(user.lastActivityAt) : 'Never'}
                  </Text>
                </View>
              </View>

              {/* Row 2: Phone */}
              <Text style={styles.phoneText}>{user.phoneNumber}</Text>

              {/* Row 3: Recent activity preview pills */}
              {user.recentEvents && user.recentEvents.length > 0 && (
                <View style={styles.eventsRow}>
                  {user.recentEvents.slice(0, 3).map((event: ActivityEventPreview, idx: number) => {
                    const color = getEventTypeColor(event.eventType);
                    return (
                      <View
                        key={idx}
                        style={[styles.eventPill, { backgroundColor: `${color}26` }]}
                      >
                        <Text style={[styles.eventPillText, { color }]}>
                          {getEventTypeLabel(event.eventType)}
                          {event.serverTimestamp
                            ? `  ${formatRelativeTime(event.serverTimestamp)}`
                            : ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Row 4: Card actions */}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.addCreditsBtn}
                  onPress={() => {
                    setCreditModalUserId(user.userId);
                    setCreditModalUserName(user.name);
                    setCreditModalVisible(true);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={14} color="#34C759" />
                  <Text style={styles.addCreditsBtnText}>Add Credits</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Load More */}
        {hasMore && (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.loadMoreText}>Load More</Text>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <AddCreditsModal
        visible={creditModalVisible}
        onClose={() => setCreditModalVisible(false)}
        userId={creditModalUserId}
        userName={creditModalUserName}
      />
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
  sortScrollView: {
    flexGrow: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  sortScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  sortChipActive: {
    backgroundColor: '#007AFF',
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#007AFF',
  },
  sortChipTextActive: {
    color: '#fff',
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
    padding: 0,
  },
  userCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  lastActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeDot: {
    marginRight: 2,
  },
  lastActiveText: {
    fontSize: 13,
    color: '#666',
  },
  phoneText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  eventsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  eventPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  eventPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  addCreditsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addCreditsBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34C759',
  },
  loadMoreButton: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  emptyContainer: {
    paddingVertical: 64,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
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
  bottomSpacer: {
    height: 24,
  },
});
