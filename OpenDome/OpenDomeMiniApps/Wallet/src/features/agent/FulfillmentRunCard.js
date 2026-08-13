import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { USE_NATIVE_DRIVER } from '../../utils/styleCompat';
import { FULFILL_PHASES } from './fulfillmentDrama';

const RAIL = [
  { id: 'reserve', label: '1 · Reserve' },
  { id: 'confirm', label: '2 · Confirm' },
  { id: 'pay', label: '3 · Pay' },
];

function railIndex(phase) {
  if (phase === FULFILL_PHASES.RESERVING) return 0;
  if (phase === FULFILL_PHASES.CONFIRMING) return 1;
  return 2;
}

function ThinkingDots({ color }) {
  const a = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 420, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(a, { toValue: 0.3, duration: 420, useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  return (
    <Animated.Text style={{ color, opacity: a, fontSize: 11, fontFamily: 'monospace' }}>
      ···
    </Animated.Text>
  );
}

function statusLabel(status) {
  if (status === 'holding') return 'HOLD';
  if (status === 'reserved') return 'HELD';
  if (status === 'confirmed') return 'CONFIRMED';
  if (status === 'paid') return 'PAID';
  return 'WAIT';
}

export function FulfillmentRunCard({
  phase,
  venues = [],
  note,
  payingLabel,
  tokens,
  done,
}) {
  const active = railIndex(phase);
  const complete = Boolean(done) || phase === FULFILL_PHASES.DONE;

  return (
    <View style={[styles.card, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
          Gemini booking
        </Text>
        <Text style={[styles.phase, { color: tokens.ACCENT, fontFamily: tokens.font.mono }]}>
          {complete ? 'Complete' : `Step ${active + 1}/3`}
        </Text>
      </View>

      <View style={styles.rail}>
        {RAIL.map((step, i) => {
          const on = i === active && !complete;
          const prev = complete || i < active;
          const color = prev || on ? tokens.ACCENT : tokens.MUTED;
          return (
            <View key={step.id} style={styles.railStep}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: prev || on ? tokens.ACCENT : tokens.BORDER,
                    borderColor: color,
                  },
                ]}
              />
              <Text
                style={[
                  styles.railLabel,
                  { color, fontFamily: tokens.font.mono, fontWeight: on ? '700' : '400' },
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={[styles.note, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
        {note || ' '}
      </Text>

      <View style={styles.list}>
        {venues.map((venue) => {
          const busy = venue.status === 'holding';
          const ok = venue.status === 'reserved' || venue.status === 'confirmed' || venue.status === 'paid';
          return (
            <View
              key={venue.id}
              style={[
                styles.row,
                {
                  borderColor: ok ? tokens.ACCENT : tokens.BORDER,
                  backgroundColor: tokens.SURFACE_SUBTLE,
                },
              ]}
            >
              <View style={styles.rowTop}>
                <Text style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]} numberOfLines={1}>
                  {venue.title}
                </Text>
                {busy ? (
                  <ThinkingDots color={tokens.ACCENT} />
                ) : (
                  <Text
                    style={[
                      styles.status,
                      { color: ok ? tokens.SUCCESS : tokens.MUTED, fontFamily: tokens.font.mono },
                    ]}
                  >
                    {statusLabel(venue.status)}
                  </Text>
                )}
              </View>
              <Text style={[styles.meta, { color: tokens.MUTED, fontFamily: tokens.font.primary }]} numberOfLines={1}>
                {venue.placeName} · {venue.slot}
              </Text>
              <Text style={[styles.code, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.mono }]}>
                {venue.status !== 'idle' && venue.status !== 'holding' ? `hold ${venue.holdCode}` : ' '}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.paySlot}>
        {phase === FULFILL_PHASES.PAYING || complete ? (
          <View style={[styles.payBanner, { backgroundColor: tokens.USDC_SOFT, borderColor: tokens.BORDER }]}>
            <Text style={[styles.payText, { color: tokens.USDC, fontFamily: tokens.font.primary }]}>
              {payingLabel || 'Unified USDC payment for all holds + NFT mint'}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: { fontSize: 12 },
  phase: { fontSize: 10, letterSpacing: 0.4 },
  rail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 4,
  },
  railStep: { flex: 1, alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1 },
  railLabel: { fontSize: 9, letterSpacing: 0.2, textAlign: 'center' },
  note: { fontSize: 13, lineHeight: 18, minHeight: 36, marginBottom: 12 },
  list: { gap: 8 },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 10,
    minHeight: 72,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
    gap: 8,
  },
  title: { fontSize: 14, fontWeight: '600', flex: 1 },
  status: { fontSize: 10, letterSpacing: 0.6 },
  meta: { fontSize: 11 },
  code: { fontSize: 10, marginTop: 4, minHeight: 14 },
  paySlot: {
    minHeight: 52,
    marginTop: 12,
    justifyContent: 'center',
  },
  payBanner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  payText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
});
