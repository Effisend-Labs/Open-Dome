import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { getDayPlanHeadline, withUsdc } from './dayPlanCopy';
import { useSmartSize } from '../../providers/smartProvider';

function StopRow({ stop, isLast, tokens, n }) {
  const isAnchor = stop.kind === 'anchor';
  const timeRange =
    stop.endTime && stop.endTime !== stop.startTime
      ? `${stop.startTime} – ${stop.endTime}`
      : stop.startTime;

  return (
    <View style={styles.stopRow}>
      <View style={[styles.railCol, { width: n(16) }]}>
        <View
          style={[
            styles.railDot,
            {
              width: n(10),
              height: n(10),
              borderRadius: n(5),
              backgroundColor: isAnchor ? tokens.ACCENT : tokens.SURFACE,
              borderColor: isAnchor ? tokens.ACCENT : tokens.BORDER,
            },
          ]}
        />
        {!isLast ? <View style={[styles.railLine, { backgroundColor: tokens.BORDER }]} /> : null}
      </View>
      <View style={[styles.stopBody, { paddingBottom: n(14) }]}>
        <Text style={[styles.stopTime, { color: tokens.MUTED, fontSize: n(11) }]}>{timeRange}</Text>
        <Text
          style={[
            styles.stopTitle,
            { color: isAnchor ? tokens.ACCENT : tokens.FG, fontSize: n(15) },
          ]}
        >
          {stop.title}
        </Text>
        <Text style={[styles.stopPlace, { color: tokens.MUTED, fontSize: n(12) }]}>
          {stop.placeName}
        </Text>
      </View>
    </View>
  );
}

/** In-frame review sheet — never RN Modal (that escapes SmartProvider). */
export function ItineraryProposalSheet({ proposal, tokens, onClose, totalLabel }) {
  const { normalize: n } = useSmartSize();
  if (!proposal) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={[styles.sheet, { backgroundColor: tokens.BG, borderColor: tokens.BORDER }]}>
        <View style={[styles.header, { paddingHorizontal: n(20), paddingTop: n(16) }]}>
          <View style={{ flex: 1, paddingRight: n(12) }}>
            <Text style={[styles.kicker, { color: tokens.MUTED, fontSize: n(12) }]}>Review plan</Text>
            <Text style={[styles.title, { color: tokens.FG, fontSize: n(20) }]}>
              {getDayPlanHeadline(proposal)}
            </Text>
            {proposal.dateLabel ? (
              <Text style={[styles.date, { color: tokens.MUTED, fontSize: n(13) }]}>
                {proposal.dateLabel}
              </Text>
            ) : null}
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingHorizontal: n(20), paddingBottom: n(16) }}
          showsVerticalScrollIndicator={false}
        >
          {(proposal.stops || []).map((stop, index) => (
            <StopRow
              key={`${stop.id}-${index}`}
              stop={stop}
              isLast={index === proposal.stops.length - 1}
              tokens={tokens}
              n={n}
            />
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingHorizontal: n(20), paddingBottom: n(108) }]}>
          {totalLabel ? (
            <Text style={[styles.total, { color: tokens.MUTED, fontSize: n(14) }]}>
              Total {withUsdc(totalLabel)}
            </Text>
          ) : null}
          <TouchableOpacity
            onPress={onClose}
            style={[styles.btn, { backgroundColor: tokens.FG }]}
          >
            <Text style={[styles.btnText, { color: tokens.BG, fontSize: n(16) }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  sheet: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  header: { paddingBottom: 8 },
  kicker: { marginBottom: 4 },
  title: { fontWeight: '700', letterSpacing: -0.4 },
  date: { marginTop: 4 },
  scroll: { flex: 1 },
  stopRow: { flexDirection: 'row', minHeight: 52 },
  railCol: { alignItems: 'center' },
  railDot: { borderWidth: 1.5, marginTop: 4 },
  railLine: { flex: 1, width: StyleSheet.hairlineWidth, marginTop: 4 },
  stopBody: { flex: 1, paddingLeft: 8 },
  stopTime: { marginBottom: 2 },
  stopTitle: { fontWeight: '600' },
  stopPlace: { marginTop: 2 },
  footer: { paddingTop: 8 },
  total: { fontWeight: '600', marginBottom: 10 },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  btnText: { fontWeight: '700' },
});
