import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { adminAPI } from '@/services/api-client';
import { ActivityEvent, UserActivitySummary } from '@/types/admin.types';
import AddCreditsModal from '@/components/AddCreditsModal';

// ========================================
// Helper functions (copied from user-activity.tsx — no shared utils per plan scope)
// ========================================

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

function formatFullTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    const datePart = date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timePart = date.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${datePart}, ${timePart}`;
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

// Standard fields already displayed explicitly — skip them in metadata rendering
const SKIP_METADATA_KEYS = new Set(['eventType', 'timestamp', 'userId', 'eventId', 'serverTimestamp']);

function renderMetadata(metadata: Record<string, unknown>): Array<{ key: string; value: string }> {
  return Object.entries(metadata)
    .filter(([key, value]) => !SKIP_METADATA_KEYS.has(key) && value != null)
    .map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    }));
}

// Event types for filter pills
const EVENT_TYPE_FILTERS = [
  'screen_view',
  'button_click',
  'tab_open',
  'booking',
  'login',
  'profile_update',
  'app_open',
  'app_background',
];

export default function UserActivityDetailsScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [user, setUser] = useState<UserActivitySummary | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [creditModalVisible, setCreditModalVisible] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchTimeline();
    }
  }, [userId]);

  // Re-fetch when filter changes
  useEffect(() => {
    if (userId) {
      setEvents([]);
      setLastKey(null);
      setHasMore(false);
      fetchTimeline();
    }
  }, [selectedEventType]);

  const fetchTimeline = useCallback(
    async (isRefresh = false) => {
      if (!userId) return;

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError('');

        const response = await adminAPI.getUserTimeline(userId, {
          limit: 50,
          eventType: selectedEventType || undefined,
        });

        if (response.success && response.data) {
          const data = response.data as any;
          setUser(data.user || null);
          const fetchedEvents = Array.isArray(data.events) ? data.events : [];
          setEvents(fetchedEvents);
          setLastKey(data.lastEvaluatedKey || null);
          setHasMore(!!data.lastEvaluatedKey);
          console.log('[UserActivityDetails] Loaded', fetchedEvents.length, 'events for', userId);
        } else {
          setError(response.error || 'Failed to load timeline');
        }
      } catch (err: any) {
        console.error('[UserActivityDetails] Error:', err);
        setError(err.message || 'Failed to load timeline');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId, selectedEventType]
  );

  const loadMore = async () => {
    if (loadingMore || !hasMore || !lastKey || !userId) return;

    try {
      setLoadingMore(true);

      const response = await adminAPI.getUserTimeline(userId, {
        limit: 50,
        lastKey: JSON.stringify(lastKey),
        eventType: selectedEventType || undefined,
      });

      if (response.success && response.data) {
        const data = response.data as any;
        const moreEvents = Array.isArray(data.events) ? data.events : [];
        setEvents(prev => [...prev, ...moreEvents]);
        setLastKey(data.lastEvaluatedKey || null);
        setHasMore(!!data.lastEvaluatedKey);
      }
    } catch (err: any) {
      console.error('[UserActivityDetails] Load more error:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFilterChange = (eventType: string | null) => {
    // Toggle: tapping same filter clears it
    setSelectedEventType(prev => (prev === eventType ? null : eventType));
  };

  const onRefresh = () => {
    setEvents([]);
    setLastKey(null);
    setHasMore(false);
    fetchTimeline(true);
  };

  if (loading && events.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading timeline...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchTimeline()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Activity</Text>
        <TouchableOpacity
          onPress={() => setCreditModalVisible(true)}
          style={styles.headerCreditsBtn}
          disabled={!user}
        >
          <Ionicons name="add-circle-outline" size={20} color={user ? '#34C759' : '#ccc'} />
          <Text style={[styles.headerCreditsBtnText, !user && { color: '#ccc' }]}>Credits</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* User Summary Card */}
        {user && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryName}>{user.name}</Text>
            <Text style={styles.summaryPhone}>{user.phoneNumber}</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Signed up:</Text>
              <Text style={styles.summaryValue}>
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Last active:</Text>
              <Text style={styles.summaryValue}>
                {user.lastActivityAt ? formatRelativeTime(user.lastActivityAt) : 'Never'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total events:</Text>
              <Text style={styles.summaryValue}>{user.totalEvents}</Text>
            </View>
          </View>
        )}

        {/* Event Type Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterScrollContent}
        >
          {/* "All" pill */}
          <TouchableOpacity
            style={[
              styles.filterPill,
              selectedEventType === null && styles.filterPillSelected,
            ]}
            onPress={() => handleFilterChange(null)}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedEventType === null && styles.filterPillTextSelected,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {EVENT_TYPE_FILTERS.map((et) => {
            const isSelected = selectedEventType === et;
            const color = getEventTypeColor(et);
            return (
              <TouchableOpacity
                key={et}
                style={[
                  styles.filterPill,
                  isSelected && { backgroundColor: color, borderColor: color },
                ]}
                onPress={() => handleFilterChange(et)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextSelected,
                  ]}
                >
                  {getEventTypeLabel(et)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Timeline */}
        {events.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={48} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No activity events</Text>
            {selectedEventType && (
              <Text style={styles.emptySubtitle}>Try removing the filter</Text>
            )}
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {events.map((event, index) => {
              const color = getEventTypeColor(event.eventType);
              const isLast = index === events.length - 1;
              const metaItems = event.metadata ? renderMetadata(event.metadata) : [];

              return (
                <View key={event['timestamp#eventId'] || `${event.timestamp}-${index}`} style={styles.timelineItem}>
                  {/* Timeline visual: dot + line */}
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: color }]} />
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>

                  {/* Event content */}
                  <View style={styles.timelineContent}>
                    {/* Event type badge */}
                    <View style={[styles.eventBadge, { backgroundColor: `${color}26` }]}>
                      <Text style={[styles.eventBadgeText, { color }]}>
                        {getEventTypeLabel(event.eventType)}
                      </Text>
                    </View>

                    {/* Screen name or action */}
                    {event.screenName && (
                      <Text style={styles.eventDescription}>Screen: {event.screenName}</Text>
                    )}
                    {!event.screenName && event.action && (
                      <Text style={styles.eventDescription}>{event.action}</Text>
                    )}

                    {/* Metadata key-value pairs */}
                    {metaItems.length > 0 && (
                      <View style={styles.metadataContainer}>
                        {metaItems.map(({ key, value }) => (
                          <Text key={key} style={styles.metadataRow}>
                            <Text style={styles.metadataKey}>{key}:</Text> {value}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Timestamps */}
                    <Text style={styles.timestampRelative}>
                      {formatRelativeTime(event.serverTimestamp || event.timestamp)}
                    </Text>
                    <Text style={styles.timestampFull}>
                      {formatFullTimestamp(event.serverTimestamp || event.timestamp)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
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
        userId={userId || ''}
        userName={user?.name || ''}
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
  // Header
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerCreditsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerCreditsBtnText: {
    fontSize: 13,
    color: '#34C759',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  // Summary Card
  summaryCard: {
    backgroundColor: '#007AFF10',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#007AFF30',
  },
  summaryName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  summaryPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  summaryLabel: {
    width: 110,
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  // Filter pills
  filterScrollView: {
    marginTop: 12,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  filterPillSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  filterPillTextSelected: {
    color: '#fff',
  },
  // Timeline
  timelineContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e9ecef',
    marginTop: 4,
    minHeight: 16,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  eventBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  eventBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventDescription: {
    fontSize: 13,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  metadataContainer: {
    marginTop: 4,
    marginBottom: 4,
  },
  metadataRow: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  metadataKey: {
    fontWeight: '600',
    color: '#999',
  },
  timestampRelative: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 4,
  },
  timestampFull: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  // Empty state
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
  // Load more
  loadMoreButton: {
    marginHorizontal: 16,
    marginTop: 8,
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
  // Common
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
