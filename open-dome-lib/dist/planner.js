"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DEFAULT_EVENT_VENUE = void 0;
exports.buildItineraryForEvent = buildItineraryForEvent;
exports.createEmptySession = createEmptySession;
exports.formatEventLine = formatEventLine;
exports.formatEventsList = formatEventsList;
exports.isEventsCatalogLag = isEventsCatalogLag;
exports.isEventsListIntent = isEventsListIntent;
exports.isItineraryFollowUpIntent = isItineraryFollowUpIntent;
exports.isPurchaseIntent = isPurchaseIntent;
exports.listUpcomingEvents = listUpcomingEvents;
exports.pickEventFromMessage = pickEventFromMessage;
exports.resolveVenueFromMessage = resolveVenueFromMessage;
var _events = require("./events");
var _itinerary = require("./itinerary");
/** Default demo venue — has live upcoming dates in the catalog (Korakuen often lags). */
const DEFAULT_EVENT_VENUE = exports.DEFAULT_EVENT_VENUE = 'Tokyo Dome';

/**
 * Pick a venue from free text. Falls back to Tokyo Dome (real upcoming events).
 */
function resolveVenueFromMessage(text, fallback = DEFAULT_EVENT_VENUE) {
  const t = String(text || '').toLowerCase();
  if (/\bkorakuen\b/.test(t)) return 'Korakuen Hall';
  if (/\bimm\s*theater\b/.test(t)) return 'IMM Theater';
  if (/\bg-?rosso\b/.test(t)) return 'Theater G-Rosso';
  if (/\btokyo\s*dome\b/.test(t) || /\bdome\s+events?\b/.test(t)) return 'Tokyo Dome';
  return fallback;
}

/**
 * Upcoming events at a venue, sorted by date.
 * If the catalog has no future dates (common when the scrape lags),
 * fall back to the most recent past events so planner skills stay testable.
 */
function listUpcomingEvents({
  placeName = DEFAULT_EVENT_VENUE,
  limit = 5
} = {}) {
  const now = Date.now();
  // No search limit — need the full venue set to pick the true "next" or "latest"
  const atVenue = _events.Events.search({
    placeName
  }).sort((a, b) => (a.from || 0) - (b.from || 0));
  const upcoming = atVenue.filter(e => (e.from || 0) >= now - 86400000);
  if (upcoming.length) return upcoming.slice(0, limit);
  // Catalog lag — use last N shows chronologically for demo / skill testing
  return atVenue.slice(-limit);
}
function formatEventLine(event, index) {
  const date = new Date(event.from).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const time = event.fromTime || '';
  return `${index + 1}. **${event.title}** — ${date}${time ? ` · ${time}` : ''} · ${event.category}`;
}
function formatEventsList(events, placeName) {
  if (!events.length) {
    return `I couldn't find upcoming events at ${placeName}. Try another venue or date range.`;
  }
  const now = Date.now();
  const allPast = events.every(e => (e.from || 0) < now - 86400000);
  // Keep the original conversational UX — list lives in the card, not in markdown.
  if (allPast) {
    return `No future dates in the catalog for ${placeName} yet — here are the most recent shows (fine for planning demos).`;
  }
  return `Here are the next ${events.length} events at ${placeName}.`;
}

/** True when the list is a catalog-lag fallback (all past). */
function isEventsCatalogLag(events) {
  if (!events?.length) return false;
  const now = Date.now();
  return events.every(e => (e.from || 0) < now - 86400000);
}
function isEventsListIntent(text) {
  return /\b(next|upcoming|which|what|list|show|any)\b.*\b(event|show|concert|game)s?\b/i.test(text) || /\b(tokyo\s*dome|korakuen\s*hall|imm\s*theater)\b.*\b(event|show|concert|game)s?\b/i.test(text) || /\bevents?\s+at\s+(tokyo\s*dome|korakuen|imm)/i.test(text) || /\b(dome|giants|baseball)\b.*\b(event|show|game|schedule)s?\b/i.test(text);
}
function isItineraryFollowUpIntent(text, session) {
  if (!session?.lastEventsList?.length && !session?.selectedEvent) return false;
  return /\b(that day|full (day|itinerary)|plan (my|the) day|make (an |a )?itinerary|tdc day|tokyo dome city)\b/i.test(text) || /\b(itinerary|plan|schedule)\b/i.test(text) && session?.selectedEvent;
}
function isPurchaseIntent(text) {
  return /\b(buy|book|reserve|checkout|purchase|get tickets|pay|sign)\b/i.test(text) && /\b(ticket|pass|itinerary|hours?|slot|reservation|all|everything)\b/i.test(text) || /\b(buy the tickets and reserve|reserve that hours?|ok buy)\b/i.test(text);
}
function pickEventFromMessage(text, session) {
  const list = session?.lastEventsList || [];
  const lower = text.toLowerCase();
  const numMatch = lower.match(/\b(?:#|number\s*)?(\d{1,2})\b/);
  if (numMatch) {
    const idx = Number(numMatch[1]) - 1;
    if (list[idx]) return list[idx];
  }
  if (session?.selectedEvent) {
    const title = session.selectedEvent.title?.toLowerCase() || '';
    if (title && lower.includes(title.slice(0, Math.min(12, title.length)))) {
      return session.selectedEvent;
    }
  }
  const fromList = list.find(e => {
    const t = (e.title || '').toLowerCase();
    return t.length > 4 && lower.includes(t.slice(0, 10));
  });
  if (fromList) return fromList;
  if (isItineraryFollowUpIntent(text, session)) {
    return session.selectedEvent || list[0] || null;
  }
  return null;
}

/** Build TDC day plan anchored on a specific event (affinity-ranked amenities). */
function buildItineraryForEvent(event, {
  userText
} = {}) {
  if (!event) return null;
  const proposal = (0, _itinerary.buildItineraryProposal)({
    anchorEventId: event.id,
    userText
  });
  if (!proposal) return null;
  return {
    ...proposal,
    title: 'Your day at Tokyo Dome City',
    subtitle: `Around ${event.title}`,
    anchorEventId: event.id
  };
}
function createEmptySession() {
  return {
    lastEventsList: [],
    selectedEvent: null,
    proposal: null,
    quote: null,
    lastConfirmation: null
  };
}