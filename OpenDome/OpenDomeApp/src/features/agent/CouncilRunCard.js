import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { USE_NATIVE_DRIVER } from './styleCompat';
import { COUNCIL_PHASES } from './councilDrama';
import { GeminiMark } from './GeminiMark';
import { PaymentNetworkPicker } from './PaymentNetworkPicker';

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
      Gemini drafting…
    </Animated.Text>
  );
}

function headline({ phase, awaiting, winner, chosenName, overridden }) {
  if (phase === COUNCIL_PHASES.DONE) {
    return overridden ? `Booked ${chosenName}'s day. ${winner?.name} had won.` : `Booked ${chosenName}'s day.`;
  }
  if (phase === COUNCIL_PHASES.PAYING) return 'Holding your spots…';
  if (awaiting && overridden) return `${winner?.name} won. You're booking ${chosenName}.`;
  if (awaiting) return `${winner?.name} won. Tap another plan to change.`;
  if (phase === COUNCIL_PHASES.WINNER || phase === COUNCIL_PHASES.JUDGING) {
    return winner?.name ? `${winner.name} is ahead.` : 'Picking a winner…';
  }
  return 'Four Gemini planners, four days.';
}

function AgentRow({ agent, tokens, isWinner, isChosen, selectable, onPress }) {
  const thinking = agent.status === 'thinking';
  const plan = thinking ? null : agent.summary;

  return (
    <TouchableOpacity
      activeOpacity={selectable ? 0.75 : 1}
      disabled={!selectable}
      onPress={onPress}
      style={[
        styles.row,
        {
          borderTopColor: tokens.BORDER,
          backgroundColor: isChosen ? tokens.ACCENT_SOFT : 'transparent',
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          {
            borderColor: isChosen ? tokens.ACCENT : tokens.MUTED,
            backgroundColor: isChosen ? tokens.ACCENT : 'transparent',
          },
        ]}
      />
      <View style={styles.rowBody}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: tokens.FG, fontFamily: tokens.font.primary }]} numberOfLines={1}>
            {agent.name}
          </Text>
          {isWinner ? (
            <Text style={[styles.winner, { color: tokens.SUCCESS, fontFamily: tokens.font.primary }]}>
              Winner
            </Text>
          ) : null}
        </View>
        <View style={styles.planSlot}>
          {thinking ? (
            <ThinkingDots color={tokens.ACCENT} />
          ) : (
            <Text
              style={[styles.plan, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}
              numberOfLines={1}
            >
              {plan || agent.role || ' '}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Four planners as a guest choice list — not a status dashboard.
 */
export function CouncilRunCard({
  phase,
  agents = [],
  winner,
  chosenId,
  tokens,
  payingLabel,
  onConfirm,
  onReview,
  confirmDisabled,
  paymentAmount,
  paymentNetwork,
  onPaymentNetworkChange,
  onSelectAgent,
}) {
  const done = phase === COUNCIL_PHASES.DONE;
  const awaiting = phase === COUNCIL_PHASES.AWAITING_CONFIRM;
  const decided =
    phase === COUNCIL_PHASES.WINNER ||
    awaiting ||
    phase === COUNCIL_PHASES.PAYING ||
    done;
  const selectedId = chosenId || winner?.id;
  const chosenName =
    agents.find((a) => a.id === selectedId)?.name || winner?.name || 'this';
  const overridden = Boolean(winner?.id && selectedId && selectedId !== winner.id);
  const title = headline({ phase, awaiting, winner, chosenName, overridden });

  return (
    <View style={[styles.card, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
      <View style={styles.header}>
        <View style={styles.kickerWrap}>
          <GeminiMark tokens={tokens} label="Gemini council" />
        </View>
        <Text style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={styles.list}>
        {agents.map((agent) => (
          <AgentRow
            key={agent.id}
            agent={agent}
            tokens={tokens}
            isWinner={decided && winner?.id === agent.id}
            isChosen={decided && selectedId === agent.id}
            selectable={awaiting && agent.status !== 'idle'}
            onPress={() => onSelectAgent?.(agent.id)}
          />
        ))}
      </View>

      <View style={styles.footer}>
        {awaiting ? (
          <View style={styles.checkout}>
            <PaymentNetworkPicker
              tokens={tokens}
              value={paymentNetwork}
              onChange={onPaymentNetworkChange}
            />
            <View style={styles.actions}>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={confirmDisabled}
                onPress={onReview}
                style={[styles.reviewCta, { borderColor: tokens.BORDER }]}
              >
                <Text style={[styles.reviewText, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
                  Review plan
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={confirmDisabled}
                onPress={onConfirm}
                style={[
                  styles.payCta,
                  {
                    backgroundColor: tokens.ACCENT,
                    opacity: confirmDisabled ? 0.5 : 1,
                  },
                ]}
              >
                <Text style={[styles.payTitle, { color: '#FFFFFF', fontFamily: tokens.font.primary }]}>
                  Pay now
                </Text>
                <Text style={[styles.payAmount, { color: '#FFFFFF', fontFamily: tokens.font.mono }]}>
                  {paymentAmount || 'USDC'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={[styles.footerLine, { color: tokens.MUTED, fontFamily: tokens.font.primary }]} numberOfLines={1}>
            {phase === COUNCIL_PHASES.PAYING
              ? payingLabel || 'Holding your spots…'
              : done
                ? 'Passes are on the way.'
                : ' '}
          </Text>
        )}
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
  list: {
    height: ROW_H * 4,
  },
  row: {
    height: ROW_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
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
    height: 40,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    height: 22,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  winner: {
    fontSize: 13,
    fontWeight: '500',
  },
  planSlot: {
    height: 18,
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
  checkout: {
    gap: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  reviewCta: {
    flex: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reviewText: {
    fontSize: 14,
    fontWeight: '600',
  },
  payCta: {
    flex: 1.1,
    minHeight: 56,
    borderRadius: 12,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  payTitle: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.9,
  },
  payAmount: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '700',
  },
  footerLine: {
    fontSize: 14,
    textAlign: 'center',
  },
});
