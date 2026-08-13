import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getDayPlanHeadline } from './dayPlanCopy';

/**
 * Hybrid day preview: schedule clarity + one solid CTA,
 * without sparkles / uppercase “proposal” chrome.
 */
export function ItineraryProposalCard({ proposal, tokens, onViewDetails, t }) {
  if (!proposal?.stops?.length) return null;

  const previewStops = proposal.stops.slice(0, 4);
  const headline = getDayPlanHeadline(proposal);

  return (
    <View style={[styles.card, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
          {t?.itinerary?.badge || 'Day plan'}
        </Text>
        <Text style={[styles.date, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
          {proposal.dateLabel}
        </Text>
      </View>

      <Text style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]} numberOfLines={2}>
        {headline}
      </Text>

      <View style={styles.timeline}>
        {previewStops.map((stop, index) => {
          const isAnchor = stop.kind === 'anchor';
          const isLast = index === previewStops.length - 1;
          return (
            <View key={`${stop.id}-${index}`} style={styles.row}>
              <View style={styles.rail}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isAnchor ? tokens.ACCENT : tokens.BORDER,
                      borderColor: isAnchor ? tokens.ACCENT : tokens.MUTED,
                    },
                  ]}
                />
                {!isLast ? (
                  <View style={[styles.railLine, { backgroundColor: tokens.BORDER }]} />
                ) : null}
              </View>
              <View style={styles.rowBody}>
                <Text style={[styles.time, { color: tokens.MUTED, fontFamily: tokens.font.mono }]}>
                  {stop.startTime}
                </Text>
                <Text
                  style={[
                    styles.stopTitle,
                    {
                      color: isAnchor ? tokens.ACCENT : tokens.FG,
                      fontFamily: tokens.font.primary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {stop.title}
                </Text>
                <Text
                  style={[styles.place, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}
                  numberOfLines={1}
                >
                  {stop.placeName}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onViewDetails}
        style={[styles.cta, { backgroundColor: tokens.FG }]}
      >
        <Text style={[styles.ctaText, { color: tokens.BG, fontFamily: tokens.font.primary }]}>
          {t?.itinerary?.viewFull || 'View full day'}
        </Text>
      </TouchableOpacity>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontSize: 12,
  },
  date: {
    fontSize: 12,
    flexShrink: 1,
    textAlign: 'right',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.25,
    lineHeight: 21,
    marginBottom: 14,
  },
  timeline: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 44,
  },
  rail: {
    width: 10,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  railLine: {
    width: StyleSheet.hairlineWidth,
    flex: 1,
    marginTop: 4,
    marginBottom: 2,
  },
  rowBody: {
    flex: 1,
    paddingBottom: 12,
  },
  time: {
    fontSize: 11,
    marginBottom: 2,
  },
  stopTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  place: {
    fontSize: 12,
    marginTop: 2,
  },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
