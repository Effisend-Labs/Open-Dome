import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { getEventSauce } from './eventSauce';

function formatEventDate(event) {
  if (!event?.from) return null;
  return new Date(event.from).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Event details after the user picks a show — shown before the plan CTA.
 */
export function SelectedEventCard({ event, tokens }) {
  if (!event) return null;

  const date = formatEventDate(event);
  const meta = [event.category, event.placeName].filter(Boolean).join(' · ');
  const time =
    event.fromTime && event.toTime
      ? `${event.fromTime} – ${event.toTime}`
      : event.fromTime || null;
  const sauce = getEventSauce(event);

  return (
    <View style={[styles.card, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
      <Text style={[styles.label, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
        Selected show
      </Text>

      <View style={styles.main}>
        {event.thumbnail ? (
          <Image source={{ uri: event.thumbnail }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumbFallback, { backgroundColor: tokens.SURFACE_SUBTLE, borderColor: tokens.BORDER }]}>
            <Text style={[styles.thumbLetter, { color: tokens.MUTED, fontFamily: tokens.font.mono }]}>
              {(event.title || '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.body}>
          <Text style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
            {event.title}
          </Text>
          {meta ? (
            <Text style={[styles.meta, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
              {meta}
            </Text>
          ) : null}
        </View>
      </View>

      {sauce ? (
        <Text style={[styles.sauce, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
          {sauce}
        </Text>
      ) : null}

      <View style={[styles.details, { borderTopColor: tokens.BORDER }]}>
        {date ? (
          <View style={styles.detailRow}>
            <Text style={[styles.detailKey, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
              Date
            </Text>
            <Text style={[styles.detailVal, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
              {date}
            </Text>
          </View>
        ) : null}
        {time ? (
          <View style={styles.detailRow}>
            <Text style={[styles.detailKey, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
              Time
            </Text>
            <Text style={[styles.detailVal, { color: tokens.FG, fontFamily: tokens.font.mono }]}>
              {time}
            </Text>
          </View>
        ) : null}
        {event.placeName ? (
          <View style={styles.detailRow}>
            <Text style={[styles.detailKey, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
              Venue
            </Text>
            <Text style={[styles.detailVal, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
              {event.placeName}
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
  label: {
    fontSize: 12,
    marginBottom: 10,
  },
  main: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  thumbFallback: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbLetter: {
    fontSize: 18,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  meta: {
    fontSize: 12,
    lineHeight: 17,
  },
  sauce: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
    letterSpacing: -0.1,
  },
  details: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailKey: {
    fontSize: 12,
    width: 52,
  },
  detailVal: {
    flex: 1,
    fontSize: 13,
    textAlign: 'right',
  },
});
