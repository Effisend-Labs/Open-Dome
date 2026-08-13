"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DAY_PLANNER_AGENTS = void 0;
exports.adoptCouncilCandidate = adoptCouncilCandidate;
exports.runAnchorAgent = runAnchorAgent;
exports.runCriticAgent = runCriticAgent;
exports.runDayPlannerCouncil = runDayPlannerCouncil;
exports.runSchedulerAgent = runSchedulerAgent;
exports.runScoutAgent = runScoutAgent;
var _amenities = _interopRequireDefault(require("./dbs/amenities.json"));
var _amenityAffinity = require("./amenityAffinity.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const TRAVEL_BUFFER = 20;
const SLOT_GAP = 15;
const DAY_START = 540; // 09:00
const SLOTS = ['morning', 'lunch', 'afternoon'];
const SLOT_LABELS = {
  morning: 'Morning',
  lunch: 'Lunch',
  afternoon: 'Afternoon',
  evening: 'Main Event'
};

/** Planner personas — each builds a full candidate day. */
const DAY_PLANNER_AGENTS = exports.DAY_PLANNER_AGENTS = [{
  id: 'pulse',
  name: 'Pulse',
  role: 'High-energy scout',
  tagBias: {
    thrill: 8,
    sport: 6,
    play: 4
  },
  preferredBySlot: {
    morning: ['thunder-dolphin', 'batting-corner'],
    lunch: ['tdc-food-court'],
    afternoon: ['batting-corner', 'thunder-dolphin']
  }
}, {
  id: 'zen',
  name: 'Zen',
  role: 'Calm pre-show scout',
  tagBias: {
    relax: 8,
    spa: 8,
    culture: 3
  },
  preferredBySlot: {
    morning: ['tenq', 'gallery-aamo'],
    lunch: ['laqua-lunch'],
    afternoon: ['spa-laqua', 'tenq']
  }
}, {
  id: 'curator',
  name: 'Curator',
  role: 'Culture scout',
  tagBias: {
    culture: 10,
    relax: 2
  },
  preferredBySlot: {
    morning: ['gallery-aamo', 'tenq'],
    lunch: ['laqua-lunch'],
    afternoon: ['tenq', 'gallery-aamo']
  }
}, {
  id: 'local',
  name: 'Local',
  role: 'Neighborhood day scout',
  tagBias: {
    family: 6,
    food: 4,
    play: 4,
    eat: 2
  },
  preferredBySlot: {
    morning: ['aso-bono', 'go-fun'],
    lunch: ['tdc-food-court'],
    afternoon: ['go-fun', 'aso-bono']
  }
}];
function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ── AnchorAgent ───────────────────────────────────────────────────────────────
/** Locks doors / hard deadline from the event. */
function runAnchorAgent(event) {
  const doors = event.fromTimeMinutes ?? 1110;
  const ends = event.toTimeMinutes ?? doors + 120;
  const latestActivityEnd = doors - TRAVEL_BUFFER;
  return {
    agent: 'Anchor',
    doors,
    ends,
    latestActivityEnd,
    notes: [`Doors ${formatTime(doors)}`, `Activities must end by ${formatTime(latestActivityEnd)} (${TRAVEL_BUFFER}m travel buffer)`]
  };
}
function pickForSlot(ranked, preferredIds) {
  const prefs = Array.isArray(preferredIds) ? preferredIds : preferredIds ? [preferredIds] : [];
  for (const id of prefs) {
    const hit = ranked.find(r => r.amenity.id === id);
    if (hit) return hit;
  }
  return ranked[0] || null;
}
function fillerSignature(stops) {
  return (stops || []).filter(s => s.kind === 'filler').map(s => s.amenityId || s.id).join('|');
}

// ── ScoutAgent ────────────────────────────────────────────────────────────────
/** Picks related amenities per slot with persona bias. */
function runScoutAgent(agent, {
  eventProfile,
  userIntent,
  doors,
  bannedIds
} = {}) {
  const used = new Set(bannedIds || []);
  const picks = [];
  const notes = [];
  for (const slot of SLOTS) {
    const ranked = (0, _amenityAffinity.rankAmenitiesForSlot)(slot, used, {
      eventProfile,
      userIntent,
      // Persona identity first — user prompt is applied by the critic, not all four scouts
      userText: '',
      anchorStartMinutes: doors,
      travelBufferMinutes: TRAVEL_BUFFER,
      tagBias: agent.tagBias
    });
    const top = pickForSlot(ranked, agent.preferredBySlot?.[slot]);
    if (!top) {
      notes.push(`${slot}: no fit`);
      continue;
    }
    used.add(top.amenity.id);
    picks.push({
      slot,
      amenity: top.amenity,
      scoutScore: top.score
    });
    notes.push(`${slot}: ${top.amenity.name} (${top.score.toFixed(1)})`);
  }
  return {
    agent,
    picks,
    notes
  };
}

// ── SchedulerAgent ────────────────────────────────────────────────────────────
/**
 * Places scout picks on a timeline — open hours, duration, gaps, doors deadline.
 * Drops or squeezes stops that cannot legally fit.
 */
function runSchedulerAgent({
  picks,
  doors,
  event,
  dayStart = DAY_START
}) {
  const latestEnd = doors - TRAVEL_BUFFER;
  let cursor = dayStart;
  const stops = [];
  const notes = [];
  const violations = [];
  for (const pick of picks) {
    const a = pick.amenity;
    const open = a.openFromMinutes ?? dayStart;
    const close = a.openToMinutes ?? 1440;
    const duration = a.durationMinutes || 60;
    let start = Math.max(cursor, open);
    let end = start + duration;

    // Must finish before doors buffer
    if (end > latestEnd) {
      const squeezedStart = latestEnd - duration;
      if (squeezedStart >= open && squeezedStart >= cursor - 5) {
        start = Math.max(squeezedStart, open);
        end = start + duration;
        notes.push(`Squeezed ${a.name} to end ${formatTime(end)} before doors`);
      } else {
        violations.push(`${a.name} cannot finish before doors (${formatTime(latestEnd)})`);
        notes.push(`Dropped ${a.name} — duration ${duration}m won't fit`);
        continue;
      }
    }

    // Must be open for the whole window
    if (start < open || end > close) {
      violations.push(`${a.name} outside open hours ${formatTime(open)}–${formatTime(close)}`);
      notes.push(`Dropped ${a.name} — outside open hours`);
      continue;
    }
    stops.push({
      kind: 'filler',
      slot: pick.slot,
      slotLabel: SLOT_LABELS[pick.slot],
      id: a.id,
      title: a.name,
      placeName: a.placeName,
      description: a.description,
      icon: a.icon,
      startMinutes: start,
      endMinutes: end,
      startTime: formatTime(start),
      endTime: formatTime(end),
      durationMinutes: duration,
      coordinates: a.coordinates,
      amenityId: a.id,
      scoutScore: pick.scoutScore
    });
    cursor = end + SLOT_GAP;
  }
  const anchorStart = event.fromTimeMinutes ?? doors;
  const anchorEnd = event.toTimeMinutes ?? anchorStart + 120;
  stops.push({
    kind: 'anchor',
    slot: 'evening',
    slotLabel: SLOT_LABELS.evening,
    id: String(event.id),
    title: event.title,
    placeName: event.placeName,
    description: event.category,
    icon: 'ticket-outline',
    startMinutes: anchorStart,
    endMinutes: anchorEnd,
    startTime: event.fromTime || formatTime(anchorStart),
    endTime: event.toTime || formatTime(anchorEnd),
    durationMinutes: anchorEnd - anchorStart,
    coordinates: event.coordinates,
    event,
    thumbnail: event.thumbnail
  });
  stops.sort((a, b) => a.startMinutes - b.startMinutes);
  return {
    stops,
    notes,
    violations,
    feasible: violations.length === 0
  };
}

// ── CriticAgent ───────────────────────────────────────────────────────────────
/** Scores scheduled candidates — hours, gaps, affinity, completeness. */
function runCriticAgent(candidates, {
  eventProfile,
  userIntent,
  userText,
  doors
}) {
  const latestEnd = doors - TRAVEL_BUFFER;
  const scored = candidates.map(c => {
    let score = 0;
    const reasons = [];
    const fillers = c.stops.filter(s => s.kind === 'filler');

    // Completeness
    score += fillers.length * 8;
    if (fillers.length >= 3) {
      score += 6;
      reasons.push('full morning→lunch→afternoon');
    }

    // Feasibility
    if (c.feasible) {
      score += 12;
      reasons.push('open hours + doors OK');
    } else {
      score -= 10 * (c.violations?.length || 1);
    }

    // Preference / affinity (user prompt lives here so scouts can still disagree)
    let affinity = 0;
    for (const s of fillers) {
      const amenity = _amenities.default.find(a => a.id === s.amenityId || a.id === s.id);
      if (!amenity) continue;
      affinity += (0, _amenityAffinity.scoreAmenity)(amenity, s.slot, {
        eventProfile,
        userIntent,
        userText: userText || ''
      });
    }
    score += Math.min(20, affinity / 2);

    // Idle gaps (punish dead air between stops)
    for (let i = 1; i < c.stops.length; i++) {
      const gap = c.stops[i].startMinutes - c.stops[i - 1].endMinutes;
      if (gap > 90) {
        score -= 4;
        reasons.push(`long gap before ${c.stops[i].title}`);
      } else if (gap >= 0 && gap <= 30) {
        score += 1;
      }
    }

    // Arrival cushion before doors
    const lastFiller = [...fillers].reverse()[0];
    if (lastFiller) {
      const cushion = doors - lastFiller.endMinutes;
      if (cushion >= TRAVEL_BUFFER && cushion <= TRAVEL_BUFFER + 45) {
        score += 5;
        reasons.push('tight travel buffer to doors');
      } else if (cushion < TRAVEL_BUFFER) {
        score -= 15;
      } else if (cushion > 180) {
        score -= 2;
      }
    }

    // Must not overrun latestEnd
    for (const s of fillers) {
      if (s.endMinutes > latestEnd) score -= 20;
    }
    return {
      ...c,
      criticScore: score,
      criticReasons: reasons.slice(0, 4)
    };
  });
  scored.sort((a, b) => b.criticScore - a.criticScore);
  return scored;
}

/**
 * Multi-agent council: N personas scout → schedule → critic picks the winner.
 * @param {{ event: object, userText?: string, agentCount?: number }} opts
 */
function runDayPlannerCouncil({
  event,
  userText,
  agentCount = 4
} = {}) {
  if (!event) return null;
  const eventProfile = (0, _amenityAffinity.analyzeEventProfile)(event);
  const userIntent = (0, _amenityAffinity.analyzeUserIntent)(userText);
  const anchor = runAnchorAgent(event);
  const agents = DAY_PLANNER_AGENTS.slice(0, Math.max(1, Math.min(agentCount, DAY_PLANNER_AGENTS.length)));
  const seenSignatures = new Set();
  const drafted = agents.map(agent => {
    const bannedIds = new Set();
    let scout = runScoutAgent(agent, {
      eventProfile,
      userIntent,
      userText,
      doors: anchor.doors,
      bannedIds
    });
    let scheduled = runSchedulerAgent({
      picks: scout.picks,
      doors: anchor.doors,
      event
    });
    let signature = fillerSignature(scheduled.stops);

    // If this persona collapsed onto another agent's day, ban those stops and re-scout
    if (signature && seenSignatures.has(signature)) {
      for (const id of signature.split('|')) bannedIds.add(id);
      scout = runScoutAgent(agent, {
        eventProfile,
        userIntent,
        userText,
        doors: anchor.doors,
        bannedIds
      });
      scheduled = runSchedulerAgent({
        picks: scout.picks,
        doors: anchor.doors,
        event
      });
      signature = fillerSignature(scheduled.stops);
    }
    if (signature) seenSignatures.add(signature);
    return {
      agentId: agent.id,
      agentName: agent.name,
      agentRole: agent.role,
      scoutNotes: scout.notes,
      scheduleNotes: scheduled.notes,
      violations: scheduled.violations,
      feasible: scheduled.feasible,
      stops: scheduled.stops
    };
  });
  const ranked = runCriticAgent(drafted, {
    eventProfile,
    userIntent,
    userText,
    doors: anchor.doors
  });
  const winner = ranked[0];
  const baseDate = new Date(event.from || Date.now());
  const dateLabel = baseDate.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const insight = (0, _amenityAffinity.formatAffinityInsight)(eventProfile, userIntent, winner.stops);
  const councilLine = `Council of ${agents.length}: ${winner.agentName} won (${winner.criticScore.toFixed(0)}) — ${winner.criticReasons?.[0] || 'best overall fit'}`;
  return {
    id: `proposal-${event.id}-${baseDate.toISOString().slice(0, 10)}`,
    status: 'proposal',
    title: 'Your day at Tokyo Dome City',
    subtitle: `Around ${event.title}`,
    date: baseDate.toISOString().slice(0, 10),
    dateLabel,
    anchorEventId: event.id,
    stops: winner.stops,
    summary: winner.stops.map(s => `${s.startTime} · ${s.title}`).join(' → '),
    insight: [councilLine, insight].filter(Boolean).join('\n'),
    eventProfile,
    userIntent,
    council: {
      anchor,
      winner: {
        id: winner.agentId,
        name: winner.agentName,
        role: winner.agentRole,
        score: winner.criticScore,
        reasons: winner.criticReasons
      },
      chosenId: winner.agentId,
      candidates: ranked.map(c => ({
        id: c.agentId,
        name: c.agentName,
        role: c.agentRole,
        score: c.criticScore,
        feasible: c.feasible,
        summary: c.stops.filter(s => s.kind === 'filler').map(s => s.title).join(' → '),
        stops: c.stops,
        violations: c.violations
      }))
    },
    createdAt: Date.now()
  };
}

/** Guest override — keep critic winner, swap booked stops to another candidate. */
function adoptCouncilCandidate(proposal, agentId) {
  const cand = proposal?.council?.candidates?.find(c => c.id === agentId);
  if (!cand?.stops?.length) return proposal;
  return {
    ...proposal,
    stops: cand.stops,
    summary: cand.stops.map(s => `${s.startTime} · ${s.title}`).join(' → '),
    council: {
      ...proposal.council,
      chosenId: agentId
    }
  };
}