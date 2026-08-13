import React, { useRef } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { EventsListCard } from './EventsListCard';
import { SelectedEventCard } from './SelectedEventCard';
import { PlanDayButton } from './PlanDayButton';
import { CouncilRunCard } from './CouncilRunCard';
import { FulfillmentRunCard } from './FulfillmentRunCard';
import { ItineraryProposalCard } from './ItineraryProposalCard';
import { QuoteCard } from './QuoteCard';
import { ConfirmationCard } from './ConfirmationCard';
import { COUNCIL_PHASES } from './councilDrama';
import { FULFILL_PHASES } from './fulfillmentDrama';
import { withUsdc } from './dayPlanCopy';

export function DomeAgentMessages({
  tokens,
  messages,
  isTyping,
  starters,
  emptyLabel,
  session,
  onStarter,
  onSelectEvent,
  onPlanDay,
  onSelectAgent,
  onConfirm,
  onViewPlan,
}) {
  const scrollRef = useRef(null);
  const empty = messages.length === 0 && !isTyping;
  const hideTyping = messages.some(
    (m) =>
      (m.type === 'council' && m.phase !== COUNCIL_PHASES.DONE && m.phase !== COUNCIL_PHASES.AWAITING_CONFIRM) ||
      (m.type === 'fulfillment' && m.phase !== FULFILL_PHASES.DONE),
  );

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.list}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onContentSizeChange={() => {
        if (!empty) scrollRef.current?.scrollToEnd({ animated: true });
      }}
    >
      {empty ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyLabel, { color: tokens.MUTED }]}>{emptyLabel}</Text>
          {(starters || []).map((label) => (
            <Pressable
              key={label}
              onPress={() => onStarter(label)}
              style={[styles.chip, { borderColor: tokens.BORDER, backgroundColor: tokens.SURFACE }]}
            >
              <Text style={[styles.chipText, { color: tokens.FG }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {messages.map((msg) => (
        <View key={msg.id} style={styles.turn}>
          {msg.type !== 'council' && msg.type !== 'fulfillment' ? (
            <Text
              style={{
                color: msg.role === 'system' ? tokens.DANGER : msg.role === 'user' ? tokens.FG : tokens.FG,
                fontSize: 15,
                lineHeight: 22,
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
              }}
            >
              {msg.content}
            </Text>
          ) : null}

          {msg.type === 'events' ? (
            <EventsListCard
              events={msg.events}
              tokens={tokens}
              placeName={msg.placeName}
              isCatalogLag={msg.isCatalogLag}
              onSelect={onSelectEvent}
            />
          ) : null}
          {msg.type === 'event_selected' ? (
            <>
              <SelectedEventCard event={msg.selectedEvent} tokens={tokens} />
              <PlanDayButton tokens={tokens} disabled={isTyping} onPress={() => onPlanDay()} />
            </>
          ) : null}
          {msg.type === 'council' ? (
            <CouncilRunCard
              phase={msg.phase}
              agents={msg.agents}
              winner={msg.winner}
              chosenId={msg.chosenId || session?.proposal?.council?.chosenId}
              tokens={tokens}
              payingLabel={msg.payingLabel}
              onSelectAgent={onSelectAgent}
              confirmDisabled={isTyping}
              confirmLabel={
                (msg.quote || session?.quote)?.totalLabel
                  ? `Pay ${withUsdc((msg.quote || session?.quote).totalLabel)}`
                  : 'Pay'
              }
              onConfirm={onConfirm}
              onReview={() => onViewPlan(msg.proposal || session?.proposal)}
            />
          ) : null}
          {msg.type === 'fulfillment' ? (
            <FulfillmentRunCard
              phase={msg.phase}
              venues={msg.venues}
              note={msg.note}
              payingLabel={msg.payingLabel}
              tokens={tokens}
              done={msg.phase === FULFILL_PHASES.DONE}
            />
          ) : null}
          {msg.type === 'itinerary' && msg.proposal ? (
            <ItineraryProposalCard
              proposal={msg.proposal}
              tokens={tokens}
              onViewDetails={() => onViewPlan(msg.proposal)}
            />
          ) : null}
          {msg.type === 'quote' && msg.quote ? (
            <QuoteCard
              quote={msg.quote}
              tokens={tokens}
              ctaLabel={session?.awaitingConfirm ? 'OK — confirm booking' : 'Sign & pay'}
              onSign={() => onConfirm({ quote: msg.quote })}
            />
          ) : null}
          {msg.type === 'confirmation' ? (
            <ConfirmationCard confirmation={msg.confirmation} tokens={tokens} />
          ) : null}
        </View>
      ))}

      {isTyping && !hideTyping ? (
        <Text style={[styles.typing, { color: tokens.MUTED }]}>Writing…</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, flexGrow: 1 },
  empty: { paddingTop: 24, gap: 8 },
  emptyLabel: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  turn: { marginBottom: 12 },
  typing: { fontSize: 14, marginTop: 4 },
});
