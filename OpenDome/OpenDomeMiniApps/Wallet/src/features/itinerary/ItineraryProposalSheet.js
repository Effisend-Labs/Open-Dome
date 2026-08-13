import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { getDayPlanHeadline } from './dayPlanCopy';

function StopRow({ stop, isLast, tokens }) {
  const isAnchor = stop.kind === 'anchor';
  const timeRange =
    stop.endTime && stop.endTime !== stop.startTime
      ? `${stop.startTime} – ${stop.endTime}`
      : stop.startTime;

  return (
    <View style={styles.stopRow}>
      <View style={styles.railCol}>
        <View
          style={[
            styles.railDot,
            {
              backgroundColor: isAnchor ? tokens.ACCENT : tokens.SURFACE,
              borderColor: isAnchor ? tokens.ACCENT : tokens.BORDER,
            },
          ]}
        />
        {!isLast ? <View style={[styles.railLine, { backgroundColor: tokens.BORDER }]} /> : null}
      </View>

      <View
        style={[
          styles.stopCard,
          {
            backgroundColor: tokens.SURFACE,
            borderColor: isAnchor ? tokens.ACCENT : tokens.BORDER,
          },
        ]}
      >
        <View style={styles.stopHeader}>
          <Text style={[styles.slotLabel, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
            {stop.slotLabel || (isAnchor ? 'Main event' : '')}
          </Text>
          <Text style={[styles.stopTime, { color: tokens.MUTED, fontFamily: tokens.font.mono }]}>
            {timeRange}
          </Text>
        </View>
        <Text
          style={[
            styles.stopTitle,
            {
              color: isAnchor ? tokens.ACCENT : tokens.FG,
              fontFamily: tokens.font.primary,
            },
          ]}
        >
          {stop.title}
        </Text>
        <Text style={[styles.placeText, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
          {stop.placeName}
          {stop.category ? ` · ${stop.category}` : ''}
        </Text>
        {stop.description ? (
          <Text style={[styles.description, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
            {stop.description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Hybrid sheet: timeline + stop cards, quiet header (no icon-filled rail / shouty eyebrow).
 */
export function ItineraryProposalSheet({ proposal, tokens, onClose, t }) {
  if (!proposal) return null;

  const headline = getDayPlanHeadline(proposal);

  return (
    <View style={styles.overlay}>
      <View style={[styles.sheet, { backgroundColor: tokens.BG, borderColor: tokens.BORDER }]}>
        <View style={styles.sheetHeader}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.label, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
              {t?.itinerary?.sheetTitle || 'Day plan'}
            </Text>
            <Text style={[styles.sheetTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
              {headline}
            </Text>
            <Text style={[styles.sheetDate, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
              {proposal.dateLabel}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={[styles.closeX, { color: tokens.MUTED }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {proposal.stops.map((stop, index) => (
            <StopRow
              key={`${stop.id}-${index}`}
              stop={stop}
              isLast={index === proposal.stops.length - 1}
              tokens={tokens}
            />
          ))}

          <View style={[styles.footerNote, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
            <Text style={[styles.footerText, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
              {t?.itinerary?.footerNote ||
                'Preview only — quote and minting come after you confirm.'}
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Fills Agent content only (Wallet header + tabs stay above in App.js)
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
  },
  sheet: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: -0.35,
    lineHeight: 25,
  },
  sheetDate: {
    fontSize: 13,
    marginTop: 6,
  },
  closeX: {
    fontSize: 16,
    lineHeight: 22,
    paddingTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    flexGrow: 1,
  },
  stopRow: {
    flexDirection: 'row',
  },
  railCol: {
    width: 18,
    alignItems: 'center',
    marginRight: 10,
  },
  railDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    marginTop: 16,
  },
  railLine: {
    flex: 1,
    width: StyleSheet.hairlineWidth,
    minHeight: 12,
    marginTop: 4,
  },
  stopCard: {
    flex: 1,
    marginBottom: 12,
    padding: 13,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  slotLabel: {
    fontSize: 11,
  },
  stopTime: {
    fontSize: 11,
  },
  stopTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  placeText: {
    fontSize: 12,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  footerNote: {
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
