import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  deleteSessionRecord,
  listSessionSummaries,
} from '../lib/tracking/historyStore';
import type { SessionSummary } from '../lib/tracking/history';
import type { Profile } from '../lib/tracking/types';

const PROFILE_GLYPH: Record<Profile, string> = {
  walking: '🚶',
  biking: '🚴',
  driving: '🚗',
};
/** Shown when no snap ever ran, so the profile is unknown. */
const NEUTRAL_GLYPH = '📍';

// --- Formatting ----------------------------------------------------------------

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(2)} km`
    : `${Math.round(meters)} m`;
}

function formatDuration(durationMs: number): string {
  const s = Math.max(0, Math.floor(durationMs / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// --- Rows ------------------------------------------------------------------------

function SummaryRow({
  summary,
  confirming,
  onPress,
  onLongPress,
  onDelete,
  onKeep,
}: {
  summary: SessionSummary;
  confirming: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onDelete: () => void;
  onKeep: () => void;
}) {
  if (confirming) {
    return (
      <View style={[styles.row, styles.rowConfirming]}>
        <Text style={styles.confirmText}>Delete session?</Text>
        <Pressable onPress={onDelete} style={styles.confirmDelete}>
          <Text style={styles.confirmDeleteText}>Delete</Text>
        </Pressable>
        <Pressable onPress={onKeep} style={styles.confirmKeep}>
          <Text style={styles.confirmKeepText}>Keep</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.row}>
      <View style={styles.glyphCircle}>
        <Text style={styles.glyph}>
          {summary.profile ? PROFILE_GLYPH[summary.profile] : NEUTRAL_GLYPH}
        </Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle}>
            {formatDate(summary.startedAt)} · {formatTime(summary.startedAt)}–
            {formatTime(summary.stoppedAt)}
          </Text>
          {summary.recovered && (
            <View style={styles.recoveredBadge}>
              <Text style={styles.recoveredBadgeText}>RECOVERED</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowMetrics}>
          {formatDistance(summary.distanceMeters)} ·{' '}
          {formatDuration(summary.durationMs)} · {summary.pointCount}{' '}
          {summary.pointCount === 1 ? 'point' : 'points'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Ionicons name="time-outline" size={48} color="#9ca3af" />
      <Text style={styles.emptyTitle}>No sessions yet</Text>
      <Text style={styles.emptySubtitle}>
        Every session you stop is saved here automatically.
      </Text>
    </View>
  );
}

// --- Screen ------------------------------------------------------------------------

export default function HistoryScreen() {
  const router = useRouter();
  const [summaries, setSummaries] = useState<SessionSummary[] | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const reload = useCallback(() => {
    listSessionSummaries()
      .then(setSummaries)
      .catch((error) => {
        console.warn('[History] load failed:', error);
        setSummaries([]);
      });
  }, []);

  // Reload whenever the screen gains focus (e.g. returning after a delete
  // in the detail screen).
  useFocusEffect(
    useCallback(() => {
      setConfirmingId(null);
      reload();
    }, [reload])
  );

  const remove = useCallback(
    (id: string) => {
      setConfirmingId(null);
      deleteSessionRecord(id)
        .catch((error) => {
          console.warn('[History] delete failed:', error);
        })
        .finally(reload);
    },
    [reload]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'History', headerShown: true }} />
      <FlatList
        data={summaries ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          summaries !== null && summaries.length === 0
            ? styles.listEmpty
            : styles.list
        }
        ListEmptyComponent={summaries === null ? undefined : <EmptyState />}
        renderItem={({ item }) => (
          <SummaryRow
            summary={item}
            confirming={confirmingId === item.id}
            onPress={() => router.push(`/session/${item.id}`)}
            onLongPress={() => setConfirmingId(item.id)}
            onDelete={() => remove(item.id)}
            onKeep={() => setConfirmingId(null)}
          />
        )}
      />
      {summaries !== null && summaries.length > 0 && (
        <Text style={styles.hint}>Long-press a session to delete it.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
    gap: 10,
  },
  listEmpty: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowConfirming: {
    backgroundColor: '#fee2e2',
  },
  glyphCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 20,
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
  recoveredBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  recoveredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
    letterSpacing: 0.5,
  },
  rowMetrics: {
    fontSize: 13,
    color: '#6b7280',
    fontVariant: ['tabular-nums'],
  },
  confirmText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#991b1b',
  },
  confirmDelete: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  confirmDeleteText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  confirmKeep: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  confirmKeepText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    padding: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  hint: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
    paddingVertical: 10,
  },
});
