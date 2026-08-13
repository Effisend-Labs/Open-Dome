import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { USE_NATIVE_DRIVER } from './styleCompat';
import { FULFILL_PHASES } from './fulfillmentDrama';
import { GeminiMark } from './GeminiMark';

const ROW_H = 64;

function ThinkingDots({ color }) {
  const a = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 420, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(a, { toValue: 0.35, duration: 420, useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  return (
    <Animated.Text style={{ color, opacity: a, fontSize: 14, lineHeight: 18 }}>
      Holding…
    </Animated.Text>
  );
}

function statusWord(status) {
  if (status === 'paid') return 'Paid';
  if (status === 'confirmed' || status === 'reserved') return 'Held';
  return null;
}

function headline({ phase, complete }) {
  if (complete || phase === FULFILL_PHASES.DONE) return 'All spots are booked.';
  if (phase === FULFILL_PHASES.PAYING) return 'Holding your spots…';
  if (phase === FULFILL_PHASES.CONFIRMING) return 'Confirming each place…';
  return 'Reserving venues…';
}

function VenueRow({ venue, tokens }) {
  const busy = venue.status === 'holding';
  const ok =
    venue.status === 'reserved' ||
    venue.status === 'confirmed' ||
    venue.status === 'paid';
  const word = statusWord(venue.status);

  return (
    <View
      style={[
        styles.row,
        {
          borderTopColor: tokens.BORDER,
          backgroundColor: ok ? tokens.ACCENT_SOFT : 'transparent',
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          {
            borderColor: ok ? tokens.ACCENT : tokens.MUTED,
            backgroundColor: ok ? tokens.ACCENT : 'transparent',
          },
        ]}
      />
      <View style={styles.rowBody}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.name, { color: tokens.FG, fontFamily: tokens.font.primary }]}
            numberOfLines={1}
          >
            {venue.title}
          </Text>
          {busy ? (
            <ThinkingDots color={tokens.ACCENT} />
          ) : word ? (
            <Text style={[styles.status, { color: tokens.SUCCESS, fontFamily: tokens.font.primary }]}>
              {word}
            </Text>
          ) : null}
        </View>
        <View style={styles.planSlot}>
          <Text
            style={[styles.plan, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}
            numberOfLines={1}
          >
            {venue.placeName} · {venue.slot}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function FulfillmentRunCard({
  phase,
  venues = [],
  note,
  payingLabel,
  tokens,
  done,
}) {
  const complete = Boolean(done) || phase === FULFILL_PHASES.DONE;
  const title = headline({ phase, complete });
  const footer =
    payingLabel ||
    (complete ? 'Passes are on the way.' : note) ||
    ' ';

  return (
    <View style={[styles.card, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
      <View style={styles.header}>
        <View style={styles.kickerWrap}>
          <GeminiMark tokens={tokens} label="Gemini booking" />
        </View>
        <Text
          style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      <View style={styles.list}>
        {venues.map((venue) => (
          <VenueRow key={venue.id} venue={venue} tokens={tokens} />
        ))}
      </View>

      <View style={styles.footer}>
        <Text
          style={[styles.footerLine, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}
          numberOfLines={1}
        >
          {footer}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    height: 64,
    justifyContent: 'center',
  },
  kickerWrap: {
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  list: {},
  row: {
    minHeight: ROW_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  rowBody: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    minHeight: 22,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    flexShrink: 1,
    flex: 1,
  },
  status: {
    fontSize: 13,
    fontWeight: '500',
  },
  planSlot: {
    minHeight: 18,
    justifyContent: 'center',
  },
  plan: {
    fontSize: 14,
    lineHeight: 18,
  },
  footer: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 8,
    justifyContent: 'center',
  },
  footerLine: {
    fontSize: 14,
    textAlign: 'center',
  },
});
