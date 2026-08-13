import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { quoteItineraryProposal } from 'opendome/src/quote';
import { toggleProposalStop } from 'opendome/src/dayPlannerAgents';
import { getDayPlanHeadline, withUsdc } from './dayPlanCopy';
import { useSmartSize } from '../../providers/smartProvider';

function StopRow({ stop, isLast, tokens, n, onToggle }) {
  const isAnchor = stop.kind === 'anchor';
  const enabled = stop.enabled !== false;
  const canToggle = !isAnchor && typeof onToggle === 'function';
  const timeRange =
    stop.endTime && stop.endTime !== stop.startTime
      ? `${stop.startTime} – ${stop.endTime}`
      : stop.startTime;

  const row = (
    <View style={[styles.stopRow, !enabled && styles.stopRowOff]}>
      <View style={[styles.railCol, { width: n(16) }]}>
        <View
          style={[
            styles.railDot,
            {
              width: n(10),
              height: n(10),
              borderRadius: n(5),
              backgroundColor: !enabled
                ? 'transparent'
                : isAnchor
                  ? tokens.ACCENT
                  : tokens.FG,
              borderColor: !enabled
                ? tokens.BORDER
                : isAnchor
                  ? tokens.ACCENT
                  : tokens.FG,
              opacity: enabled ? 1 : 0.55,
            },
          ]}
        />
        {!isLast ? <View style={[styles.railLine, { backgroundColor: tokens.BORDER }]} /> : null}
      </View>
      <View style={[styles.stopBody, { paddingBottom: n(14), flex: 1 }]}>
        <View style={styles.stopHeader}>
          <Text style={[styles.stopTime, { color: tokens.MUTED, fontSize: n(11) }]}>
            {stop.slotLabel ? `${stop.slotLabel} · ` : ''}
            {timeRange}
          </Text>
          {canToggle ? (
            <Text
              style={[
                styles.toggleHint,
                { color: enabled ? tokens.ACCENT : tokens.MUTED, fontSize: n(11) },
              ]}
            >
              {enabled ? 'On' : 'Off'}
            </Text>
          ) : isAnchor ? (
            <Text style={[styles.toggleHint, { color: tokens.MUTED, fontSize: n(11) }]}>
              Required
            </Text>
          ) : null}
        </View>
        <Text
          style={[
            styles.stopTitle,
            {
              color: !enabled ? tokens.MUTED : isAnchor ? tokens.ACCENT : tokens.FG,
              fontSize: n(15),
              textDecorationLine: enabled ? 'none' : 'line-through',
            },
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

  if (!canToggle) return row;

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      accessibilityLabel={`${enabled ? 'Disable' : 'Enable'} ${stop.title}`}
    >
      {row}
    </TouchableOpacity>
  );
}

function cloneProposal(proposal) {
  if (!proposal) return null;
  return {
    ...proposal,
    stops: (proposal.stops || []).map((s) => ({ ...s })),
  };
}

/** In-frame review sheet — never RN Modal (that escapes SmartProvider). */
export function ItineraryProposalSheet({
  proposal,
  tokens,
  onClose,
  onUpdate,
}) {
  const { normalize: n } = useSmartSize();
  const [draft, setDraft] = useState(() => cloneProposal(proposal));

  useEffect(() => {
    setDraft(cloneProposal(proposal));
  }, [proposal]);

  const draftQuote = useMemo(
    () => (draft ? quoteItineraryProposal(draft) : null),
    [draft],
  );

  if (!draft) return null;

  const stops = draft.stops || [];
  const enabledCount = stops.filter((s) => s.enabled !== false).length;
  const baseline = JSON.stringify(
    (proposal?.stops || []).map((s) => s.enabled !== false),
  );
  const current = JSON.stringify(stops.map((s) => s.enabled !== false));
  const dirty = baseline !== current;
  const canUpdate = dirty && enabledCount > 0 && Boolean(draftQuote);

  const handleToggle = (index) => {
    setDraft((prev) => {
      const { proposal: next, changed } = toggleProposalStop(prev, index);
      return changed ? next : prev;
    });
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={[styles.sheet, { backgroundColor: tokens.BG, borderColor: tokens.BORDER }]}>
        <View style={[styles.header, { paddingHorizontal: n(20), paddingTop: n(16) }]}>
          <View style={{ flex: 1, paddingRight: n(12) }}>
            <Text style={[styles.kicker, { color: tokens.MUTED, fontSize: n(12) }]}>Review plan</Text>
            <Text style={[styles.title, { color: tokens.FG, fontSize: n(20) }]}>
              {getDayPlanHeadline(draft)}
            </Text>
            {draft.dateLabel ? (
              <Text style={[styles.date, { color: tokens.MUTED, fontSize: n(13) }]}>
                {draft.dateLabel}
              </Text>
            ) : null}
            <Text style={[styles.hint, { color: tokens.MUTED, fontSize: n(12) }]}>
              Tap a stop to leave it out. Close discards. Update saves the total.
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingHorizontal: n(20), paddingBottom: n(16) }}
          showsVerticalScrollIndicator={false}
        >
          {stops.map((stop, index) => (
            <StopRow
              key={`${stop.id}-${index}`}
              stop={stop}
              isLast={index === stops.length - 1}
              tokens={tokens}
              n={n}
              onToggle={stop.kind !== 'anchor' ? () => handleToggle(index) : undefined}
            />
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingHorizontal: n(20), paddingBottom: n(108) }]}>
          {draftQuote?.totalLabel ? (
            <Text style={[styles.total, { color: tokens.MUTED, fontSize: n(14) }]}>
              Total {withUsdc(draftQuote.totalLabel)}
              {enabledCount < stops.length
                ? ` · ${enabledCount} of ${stops.length} stops`
                : ''}
            </Text>
          ) : null}
          <View style={styles.btnRow}>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.btn,
                styles.btnSecondary,
                { borderColor: tokens.BORDER, backgroundColor: tokens.SURFACE || 'transparent' },
              ]}
              accessibilityLabel="Close without saving"
            >
              <Text style={[styles.btnText, { color: tokens.FG, fontSize: n(16) }]}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onUpdate?.(draft, draftQuote)}
              disabled={!canUpdate}
              style={[
                styles.btn,
                styles.btnPrimary,
                {
                  backgroundColor: tokens.FG,
                  opacity: canUpdate ? 1 : 0.4,
                },
              ]}
              accessibilityLabel="Update plan"
            >
              <Text style={[styles.btnText, { color: tokens.BG, fontSize: n(16) }]}>Update</Text>
            </TouchableOpacity>
          </View>
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
  hint: { marginTop: 8, lineHeight: 16 },
  scroll: { flex: 1 },
  stopRow: { flexDirection: 'row', minHeight: 52 },
  stopRowOff: { opacity: 0.85 },
  railCol: { alignItems: 'center' },
  railDot: { borderWidth: 1.5, marginTop: 4 },
  railLine: { flex: 1, width: StyleSheet.hairlineWidth, marginTop: 4 },
  stopBody: { paddingLeft: 8 },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  stopTime: {},
  toggleHint: { fontWeight: '600', letterSpacing: 0.2 },
  stopTitle: { fontWeight: '600' },
  stopPlace: { marginTop: 2 },
  footer: { paddingTop: 8 },
  total: { fontWeight: '600', marginBottom: 10 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  btnSecondary: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnPrimary: {},
  btnText: { fontWeight: '700' },
});
