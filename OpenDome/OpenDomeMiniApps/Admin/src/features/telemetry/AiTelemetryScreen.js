import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Host } from 'opendome';

const COLORS = {
  bg: '#09090b',
  surface: '#18181b',
  border: '#27272a',
  fg: '#fafafa',
  muted: '#a1a1aa',
  primary: '#2563eb',
  accent: '#10b981',
  danger: '#ef4444',
};

function formatMs(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n)} ms`;
}

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

export default function AiTelemetryScreen() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const payload = await Host.aiTelemetry();
      setData(payload);
      setStatus((payload?.volume || 0) > 0 ? 'success' : 'empty');
    } catch (e) {
      setData(null);
      setError(e.message || 'Failed to load telemetry');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxIntent = Math.max(
    1,
    ...(data?.topIntents || []).map((row) => row.count),
  );

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.kicker}>Google Cloud Logging · Vertex Gemini</Text>
      <Text style={s.lede}>
        Live intent volume, latency, and tool matches from production `/api/agent`.
      </Text>

      <View style={s.linkRow}>
        <CloudLink
          label="Cloud Logging"
          url={data?.loggingUrl}
        />
        <CloudLink
          label="BigQuery"
          url={data?.bigqueryUrl}
        />
        <TouchableOpacity style={s.refresh} onPress={load} accessibilityLabel="Refresh">
          <Ionicons name="refresh" size={16} color={COLORS.fg} />
          <Text style={s.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {status === 'loading' ? (
        <View style={s.center}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={s.muted}>Reading Cloud Logging…</Text>
        </View>
      ) : null}

      {status === 'error' ? (
        <View style={s.banner}>
          <Text style={s.error}>{error}</Text>
          <TouchableOpacity style={s.retry} onPress={load}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {status === 'empty' ? (
        <View style={s.banner}>
          <Text style={s.muted}>
            No `opendome-ai-events` yet. Deploy the host emitter, then send one Dome
            or Wallet agent message. Rows also land in BigQuery dataset ai_agent_logs.
          </Text>
        </View>
      ) : null}

      {status === 'success' && data ? (
        <>
          <View style={s.cards}>
            <StatCard label="Query volume" value={String(data.volume)} />
            <StatCard label="Avg latency" value={formatMs(data.avgLatencyMs)} />
            <StatCard
              label="Top intent"
              value={data.topIntents?.[0]?.intent || '—'}
            />
          </View>

          <Text style={s.section}>Top intents</Text>
          {(data.topIntents || []).map((row) => (
            <View key={row.intent} style={s.barRow}>
              <Text style={s.barLabel} numberOfLines={1}>
                {row.intent}
              </Text>
              <View style={s.barTrack}>
                <View
                  style={[
                    s.barFill,
                    { width: `${Math.round((row.count / maxIntent) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={s.barCount}>{row.count}</Text>
            </View>
          ))}

          <Text style={s.section}>Recent events</Text>
          {(data.events || []).map((event, i) => (
            <View key={`${event.timestamp}-${i}`} style={s.event}>
              <Text style={s.eventIntent}>{event.intent}</Text>
              <Text style={s.eventMeta}>
                {formatMs(event.latency_ms)}
                {event.network ? ` · ${event.network}` : ''}
                {` · ${formatTime(event.timestamp)}`}
              </Text>
              {event.user_input ? (
                <Text style={s.eventInput} numberOfLines={2}>
                  {event.user_input}
                </Text>
              ) : null}
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

function CloudLink({ label, url }) {
  if (!url) return null;
  return (
    <TouchableOpacity
      style={s.link}
      onPress={() => Linking.openURL(url)}
      accessibilityLabel={`Open ${label} in Google Cloud`}
    >
      <Ionicons name="open-outline" size={14} color={COLORS.primary} />
      <Text style={s.linkText}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatCard({ label, value }) {
  return (
    <View style={s.card}>
      <Text style={s.cardLabel}>{label}</Text>
      <Text style={s.cardValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  kicker: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  lede: { color: COLORS.muted, fontSize: 14, lineHeight: 20 },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  linkText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  refresh: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  refreshText: { color: COLORS.fg, fontSize: 13 },
  center: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  muted: { color: COLORS.muted, fontSize: 14, lineHeight: 20 },
  banner: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  error: { color: COLORS.danger, fontSize: 14 },
  retry: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 140,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardLabel: { color: COLORS.muted, fontSize: 12, marginBottom: 6 },
  cardValue: { color: COLORS.fg, fontSize: 18, fontWeight: '700' },
  section: {
    color: COLORS.fg,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { color: COLORS.fg, fontSize: 12, width: 140 },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: 8, backgroundColor: COLORS.primary, borderRadius: 4 },
  barCount: { color: COLORS.muted, fontSize: 12, width: 28, textAlign: 'right' },
  event: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  eventIntent: { color: COLORS.fg, fontWeight: '700', fontSize: 13 },
  eventMeta: { color: COLORS.muted, fontSize: 12 },
  eventInput: { color: COLORS.fg, fontSize: 13 },
});
