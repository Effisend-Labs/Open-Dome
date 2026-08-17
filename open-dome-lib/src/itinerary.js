import amenitiesData from './dbs/amenities.json';
import { Events } from './events';
import { runDayPlannerCouncil } from './dayPlannerAgents.js';

/**
 * @param {{ anchorEventId?: number, dayDate?: string|Date, userText?: string, agentCount?: number }} opts
 */
export function buildItineraryProposal({
  anchorEventId,
  dayDate,
  userText,
  agentCount = 4,
} = {}) {
  let anchorEvent = anchorEventId != null ? Events.getById(anchorEventId) : null;

  if (!anchorEvent) {
    const upcomingDome = Events.search({
      placeName: 'Tokyo Dome',
      from: Date.now() - 86400000,
      limit: 1,
    });
    anchorEvent = upcomingDome[0] || Events.getAll()[0];
  }
  if (!anchorEvent) return null;

  // Multi-agent council: Pulse / Zen / Curator / Local → schedule → critic
  const proposal = runDayPlannerCouncil({
    event: anchorEvent,
    userText,
    agentCount,
  });
  if (!proposal) return null;

  if (dayDate) {
    const baseDate = new Date(dayDate);
    proposal.date = baseDate.toISOString().slice(0, 10);
    proposal.dateLabel = baseDate.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return proposal;
}

export function buildDemoItineraryProposal() {
  const now = Date.now();
  const tokyoDome = Events.search({ placeName: 'Tokyo Dome' })
    .filter((e) => (e.from || 0) >= now - 86400000)
    .sort((a, b) => (a.from || 0) - (b.from || 0))[0];
  const korakuen = Events.search({ placeName: 'Korakuen Hall', limit: 5 }).find(
    (e) => e.fromTimeMinutes != null,
  );
  const anchor = tokyoDome || korakuen || Events.getById(35146) || Events.getAll()[0];
  return buildItineraryProposal({ anchorEventId: anchor?.id });
}

export function isPlanningIntent(text) {
  const normalized = String(text || '').trim();
  return (
    /\b(itinerary|show day|day trip|full day|concert day|game day|before (?:the )?(?:show|game|event))\b/i.test(
      normalized,
    ) ||
    /\b(?:plan|schedule|organize|build)\b.{0,48}\b(?:day|itinerary|visit|outing|before|after|around)\b/i.test(
      normalized,
    )
  );
}

export function getAmenities() {
  return amenitiesData;
}

export function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
