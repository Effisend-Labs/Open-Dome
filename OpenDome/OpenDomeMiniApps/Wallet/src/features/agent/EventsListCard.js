import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

function formatMeta(event) {
  const date = new Date(event.from).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const parts = [date];
  if (event.fromTime) parts.push(event.fromTime);
  if (event.category) parts.push(event.category);
  return parts.join(' · ');
}

/** Numbered picks with light structure — not a booking form. */
export function EventsListCard({ events, tokens, placeName, isCatalogLag, onSelect }) {
  if (!events?.length) return null;
  const venue = placeName || events[0]?.placeName || 'Venue';

  return (
    <View style={[styles.card, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerLabel, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
          {isCatalogLag ? 'Recent' : 'Upcoming'}
        </Text>
        <Text style={[styles.venue, { color: tokens.MUTED, fontFamily: tokens.font.primary }]} numberOfLines={1}>
          {venue}
        </Text>
      </View>

      {events.map((event, index) => (
        <TouchableOpacity
          key={event.id || `${event.title}-${index}`}
          activeOpacity={0.75}
          onPress={() => onSelect?.(event, index)}
          style={[
            styles.row,
            { borderTopColor: tokens.BORDER },
          ]}
        >
          <Text style={[styles.index, { color: tokens.ACCENT, fontFamily: tokens.font.mono }]}>
            {index + 1}
          </Text>
          <View style={styles.body}>
            <Text
              style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]}
              numberOfLines={2}
            >
              {event.title}
            </Text>
            <Text style={[styles.meta, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
              {formatMeta(event)}
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      <Text style={[styles.hint, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
        Tap a show, or reply with its number.
      </Text>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLabel: {
    fontSize: 12,
  },
  venue: {
    fontSize: 12,
    flexShrink: 1,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  index: {
    fontSize: 13,
    fontWeight: '700',
    width: 16,
    paddingTop: 1,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    lineHeight: 17,
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
  },
});
