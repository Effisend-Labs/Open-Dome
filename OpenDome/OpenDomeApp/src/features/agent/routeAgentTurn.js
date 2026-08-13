import {
  listUpcomingEvents,
  formatEventsList,
  isEventsListIntent,
  isEventsCatalogLag,
  isItineraryFollowUpIntent,
  isPurchaseIntent,
  pickEventFromMessage,
  buildItineraryForEvent,
  resolveVenueFromMessage,
  DEFAULT_EVENT_VENUE,
} from 'opendome/src/planner';
import { isPlanningIntent } from 'opendome/src/itinerary';
import { quoteItineraryProposal } from 'opendome/src/quote';
import { TEST_QUOTE_PRICING, TEST_QUOTE_UNIT_USD } from './plannerConfig';
import { isConfirmBookingIntent } from './fulfillmentDrama';

function agentMsg(overrides) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role: 'agent',
    model: 'Planner',
    ...overrides,
  };
}

/**
 * Route a user turn through the local TDC planner (multi-turn session).
 * @returns {{ messages: object[], sessionPatch: object, checkoutQuote: object|null }}
 */
export function routeAgentTurn(text, session, { t } = {}) {
  const trimmed = text.trim();
  const sessionPatch = {};
  const messages = [];
  let checkoutQuote = null;

  // ── 1. List venue events (default: Tokyo Dome — has live upcoming dates) ─
  if (isEventsListIntent(trimmed)) {
    const placeName = resolveVenueFromMessage(trimmed, DEFAULT_EVENT_VENUE);
    const events = listUpcomingEvents({ placeName, limit: 5 });
    sessionPatch.lastEventsList = events;
    sessionPatch.selectedEvent = events[0] || null;

    messages.push(
      agentMsg({
        type: 'events',
        content: formatEventsList(events, placeName),
        events,
        placeName,
        isCatalogLag: isEventsCatalogLag(events),
      }),
    );
    return { messages, sessionPatch, checkoutQuote };
  }

  // ── 2. Select event by number ───────────────────────────────────────────
  if (/^\s*#?\d{1,2}\s*$/.test(trimmed) && session.lastEventsList?.length) {
    const event = pickEventFromMessage(trimmed, session);
    if (event) {
      sessionPatch.selectedEvent = event;
      messages.push(
        agentMsg({
          type: 'event_selected',
          content: 'Nice pick — here\'s the vibe. When you\'re ready, we\'ll build the day around it.',
          selectedEvent: event,
        }),
      );
      return { messages, sessionPatch, checkoutQuote };
    }
  }

  // ── 3. Build itinerary ──────────────────────────────────────────────────
  if (isPlanningIntent(trimmed) || isItineraryFollowUpIntent(trimmed, session)) {
    const event =
      pickEventFromMessage(trimmed, session) ||
      session.selectedEvent ||
      session.lastEventsList?.[0] ||
      listUpcomingEvents({ placeName: DEFAULT_EVENT_VENUE, limit: 1 })[0];

    if (!event) {
      messages.push(
        agentMsg({
          content: `I need an anchor event first. Ask me for upcoming ${DEFAULT_EVENT_VENUE} events, then pick one.`,
        }),
      );
      return { messages, sessionPatch, checkoutQuote };
    }

    const proposal = buildItineraryForEvent(event, { userText: trimmed });
    sessionPatch.selectedEvent = event;
    sessionPatch.proposal = proposal;
    sessionPatch.quote = null;

    const insightLine = proposal?.insight ? `\n${proposal.insight}` : '';
    const winner = proposal?.council?.winner;
    const councilHint = winner
      ? `\n${winner.name} (${winner.role}) ranked this plan highest across ${proposal.council.candidates?.length || 4} agents.`
      : '';
    messages.push(
      agentMsg({
        type: 'itinerary',
        content:
          (t?.agent?.itineraryReply ||
            `Here's a Tokyo Dome City day built around ${event.title}.`) +
          insightLine +
          councilHint,
        proposal,
      }),
    );
    return { messages, sessionPatch, checkoutQuote };
  }

  // ── 4. Quote + checkout ─────────────────────────────────────────────────
  if (isPurchaseIntent(trimmed) || (session.proposal && /\b(buy|book|reserve|checkout|pay|sign|ok)\b/i.test(trimmed))) {
    const proposal = session.proposal;
    if (!proposal) {
      messages.push(
        agentMsg({
          content: `I need an itinerary first. Ask for ${DEFAULT_EVENT_VENUE} events, then say "plan my full TDC day".`,
        }),
      );
      return { messages, sessionPatch, checkoutQuote };
    }

    const quote = quoteItineraryProposal(proposal, {
      ...(TEST_QUOTE_PRICING ? { testUnitPriceUsd: TEST_QUOTE_UNIT_USD } : {}),
    });
    sessionPatch.quote = quote;
    checkoutQuote = quote;

    messages.push(
      agentMsg({
        type: 'quote',
        content:
          t?.agent?.quoteReply ||
          'Here is your quote — tickets, amenity slots, and NFT minting. Review and sign to confirm.',
        quote,
      }),
    );
    return { messages, sessionPatch, checkoutQuote };
  }

  return null;
}

export function shouldUsePlanner(text, session) {
  const trimmed = text.trim();
  return (
    (session?.awaitingConfirm && isConfirmBookingIntent(trimmed)) ||
    isEventsListIntent(trimmed) ||
    isPlanningIntent(trimmed) ||
    isPurchaseIntent(trimmed) ||
    isItineraryFollowUpIntent(trimmed, session) ||
    (/^\s*#?\d{1,2}\s*$/.test(trimmed) && session?.lastEventsList?.length)
  );
}
