"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildDemoItineraryProposal = buildDemoItineraryProposal;
exports.buildItineraryProposal = buildItineraryProposal;
exports.formatTime = formatTime;
exports.getAmenities = getAmenities;
exports.isPlanningIntent = isPlanningIntent;
var _amenities = _interopRequireDefault(require("./dbs/amenities.json"));
var _events = require("./events");
var _dayPlannerAgents = require("./dayPlannerAgents.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * @param {{ anchorEventId?: number, dayDate?: string|Date, userText?: string, agentCount?: number }} opts
 */
function buildItineraryProposal({
  anchorEventId,
  dayDate,
  userText,
  agentCount = 4
} = {}) {
  let anchorEvent = anchorEventId != null ? _events.Events.getById(anchorEventId) : null;
  if (!anchorEvent) {
    const upcomingDome = _events.Events.search({
      placeName: 'Tokyo Dome',
      from: Date.now() - 86400000,
      limit: 1
    });
    anchorEvent = upcomingDome[0] || _events.Events.getAll()[0];
  }
  if (!anchorEvent) return null;

  // Multi-agent council: Pulse / Zen / Curator / Local → schedule → critic
  const proposal = (0, _dayPlannerAgents.runDayPlannerCouncil)({
    event: anchorEvent,
    userText,
    agentCount
  });
  if (!proposal) return null;
  if (dayDate) {
    const baseDate = new Date(dayDate);
    proposal.date = baseDate.toISOString().slice(0, 10);
    proposal.dateLabel = baseDate.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }
  return proposal;
}
function buildDemoItineraryProposal() {
  const now = Date.now();
  const tokyoDome = _events.Events.search({
    placeName: 'Tokyo Dome'
  }).filter(e => (e.from || 0) >= now - 86400000).sort((a, b) => (a.from || 0) - (b.from || 0))[0];
  const korakuen = _events.Events.search({
    placeName: 'Korakuen Hall',
    limit: 5
  }).find(e => e.fromTimeMinutes != null);
  const anchor = tokyoDome || korakuen || _events.Events.getById(35146) || _events.Events.getAll()[0];
  return buildItineraryProposal({
    anchorEventId: anchor?.id
  });
}
function isPlanningIntent(text) {
  const normalized = String(text || '').trim();
  return /\b(itinerary|show day|day trip|full day|concert day|game day|before (?:the )?(?:show|game|event))\b/i.test(normalized) || /\b(?:plan|schedule|organize|build)\b.{0,48}\b(?:day|itinerary|visit|outing|before|after|around)\b/i.test(normalized);
}
function getAmenities() {
  return _amenities.default;
}
function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}