import amenitiesData from './dbs/amenities.json';

const SLOT_TAGS = {
  morning: ['play', 'sport', 'family', 'thrill', 'culture'],
  lunch: ['eat', 'food'],
  afternoon: ['relax', 'spa', 'culture', 'play'],
  /** After the main event — spa, dinner, quiet wind-down. */
  after: ['relax', 'spa', 'eat', 'food', 'culture'],
};

/**
 * Stable 0..1 hash from event id — same event → same plan, different events → variety.
 */
function seedUnit(seed) {
  const n = Number(seed) || 0;
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Infer vibe tags from the anchor event (category + title).
 */
export function analyzeEventProfile(event) {
  const blob = `${event?.category || ''} ${event?.title || ''}`.toLowerCase();
  const tags = new Set();
  let energy = 'balanced';
  let audience = 'general';
  const reasons = [];

  if (/baseball|giants|lions|buffalo|carp|tigers|hayate|seibu|yomiuri|\bgame\b/.test(blob)) {
    tags.add('sport');
    tags.add('play');
    energy = 'high';
    reasons.push('baseball / game day');
  }
  if (/concert|tour|live|cinema|music|orchestra|idol|bump|arashi|sekai/.test(blob)) {
    tags.add('culture');
    tags.add('relax');
    energy = 'chill';
    reasons.push('concert / live show');
  }
  if (/wrestl|boxing|kickbox|martial|stardom|noah|ddt|fight|knock|pro-wrestling|pro wrestling/.test(blob)) {
    tags.add('sport');
    tags.add('thrill');
    energy = 'high';
    reasons.push('combat sports');
  }
  if (/family|kids|children|親子/.test(blob)) {
    tags.add('family');
    audience = 'family';
    reasons.push('family-friendly');
  }
  if (/theater|drama|show|stage/.test(blob) && !tags.has('culture')) {
    tags.add('culture');
    tags.add('relax');
    reasons.push('theater');
  }

  if (!tags.size) {
    tags.add('play');
    tags.add('relax');
    tags.add('culture');
    reasons.push('general TDC day');
  }

  return {
    tags: [...tags],
    energy,
    audience,
    reasons,
    seed: Number(event?.id) || 0,
  };
}

/**
 * Pull preference tags from the user message (golf, spa, kids, thrill…).
 */
export function analyzeUserIntent(text) {
  const t = String(text || '').toLowerCase();
  const prefer = [];
  const avoid = [];
  const reasons = [];

  if (/golf|arcade|go-?fun|mini\s*golf/.test(t)) {
    prefer.push('play', 'family');
    reasons.push('asked for play / golf');
  }
  if (/\bspa\b|onsen|relax|unwind/.test(t)) {
    prefer.push('relax', 'spa');
    reasons.push('asked for spa / relax');
  }
  if (/lunch|ramen|food|eat|dining|dinner/.test(t)) {
    prefer.push('eat', 'food');
    reasons.push('asked for food');
  }
  if (/museum|space|tenq|gallery|culture|art/.test(t)) {
    prefer.push('culture');
    reasons.push('asked for culture');
  }
  if (/coaster|thrill|dolphin|batting|sport|active/.test(t)) {
    prefer.push('thrill', 'sport', 'play');
    reasons.push('asked for active / thrill');
  }
  if (/kids|family|child|親子/.test(t)) {
    prefer.push('family');
    reasons.push('family focus');
  }
  if (/no spa|skip spa|without spa/.test(t)) {
    avoid.push('spa');
    reasons.push('skip spa');
  }

  return { prefer, avoid, reasons };
}

function amenityMatchesSlot(amenity, slot) {
  const allowed = SLOT_TAGS[slot] || [];
  return (amenity.tags || []).some((t) => allowed.includes(t));
}

/**
 * Score an amenity for a slot given event profile + user intent.
 * Higher = more related.
 */
export function scoreAmenity(amenity, slot, { eventProfile, userIntent, userText } = {}) {
  if (!amenityMatchesSlot(amenity, slot)) return -Infinity;

  let score = 0;
  const aTags = amenity.tags || [];
  const profileTags = eventProfile?.tags || [];
  const prefer = userIntent?.prefer || [];
  const avoid = userIntent?.avoid || [];
  const text = String(userText || '').toLowerCase();

  for (const tag of aTags) {
    if (profileTags.includes(tag)) score += 3;
    if (prefer.includes(tag)) score += 4;
    if (avoid.includes(tag)) score -= 8;
  }

  // Direct name / id mentions in the user question
  const name = String(amenity.name || '').toLowerCase();
  const id = String(amenity.id || '').toLowerCase();
  if (text && (text.includes(id.replace(/-/g, ' ')) || text.includes(id) || text.includes(name.split(' ')[0]))) {
    if (name.length > 2 && text.includes(name.slice(0, Math.min(6, name.length)))) score += 6;
  }
  if (/\bspa\b/.test(text) && aTags.includes('spa')) score += 8;
  if (/\bgallery\b/.test(text) && /gallery|aamo/.test(id)) score += 8;
  if (/\bgolf\b/.test(text) && id === 'go-fun') score += 8;
  if (/\bbatting\b/.test(text) && id === 'batting-corner') score += 8;
  if (/\btenq\b|space/.test(text) && id === 'tenq') score += 8;

  // Energy fit
  if (eventProfile?.energy === 'high' && aTags.some((t) => ['thrill', 'sport', 'play'].includes(t))) {
    score += 2;
  }
  if (eventProfile?.energy === 'chill' && aTags.some((t) => ['relax', 'spa', 'culture'].includes(t))) {
    score += 2;
  }
  if (eventProfile?.audience === 'family' && aTags.includes('family')) {
    score += 3;
  }

  // Slot heuristics
  if (slot === 'afternoon' && aTags.includes('spa') && eventProfile?.energy === 'chill') score += 1;
  if (slot === 'morning' && aTags.includes('thrill') && eventProfile?.energy === 'high') score += 1;
  if (slot === 'lunch' && amenity.id === 'laqua-lunch' && eventProfile?.energy === 'chill') score += 0.5;
  if (slot === 'lunch' && amenity.id === 'tdc-food-court' && eventProfile?.energy === 'high') score += 1;
  if (slot === 'after' && aTags.includes('spa')) score += 2;
  if (slot === 'after' && aTags.some((t) => ['eat', 'food'].includes(t))) score += 1.5;

  // Deterministic jitter from event seed so ties resolve differently per event
  const unit = seedUnit((eventProfile?.seed || 0) + amenity.id.length * 17 + slot.length);
  score += unit * 1.5;

  return score;
}

/**
 * Rank amenities for a slot (highest score first). Optional tagBias from a planner persona.
 */
export function rankAmenitiesForSlot(slot, usedIds, options = {}) {
  const {
    eventProfile,
    userIntent,
    userText,
    anchorStartMinutes,
    eventEndMinutes,
    travelBufferMinutes = 20,
    tagBias = {},
  } = options;

  const candidates = amenitiesData.filter((a) => {
    if (usedIds?.has?.(a.id)) return false;
    if (!amenityMatchesSlot(a, slot)) return false;
    if (slot === 'afternoon' && anchorStartMinutes != null) {
      const latestEnd = anchorStartMinutes - travelBufferMinutes;
      if ((a.openFromMinutes ?? 0) + a.durationMinutes > latestEnd) return false;
    }
    if (slot === 'after' && eventEndMinutes != null) {
      const earliestStart = eventEndMinutes + travelBufferMinutes;
      const open = a.openFromMinutes ?? 0;
      const close = a.openToMinutes ?? 1440;
      const duration = a.durationMinutes || 60;
      const start = Math.max(earliestStart, open);
      if (start + duration > close) return false;
    }
    return true;
  });

  return candidates
    .map((a) => {
      let score = scoreAmenity(a, slot, { eventProfile, userIntent, userText });
      for (const tag of a.tags || []) {
        if (tagBias[tag]) score += tagBias[tag];
      }
      return { amenity: a, score };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Pick best amenity for a slot that hasn't been used yet.
 */
export function pickRelatedAmenity(slot, usedIds, options = {}) {
  const ranked = rankAmenitiesForSlot(slot, usedIds, options);
  return ranked[0]?.amenity || null;
}

/**
 * Human-readable “why this plan” line for the agent bubble.
 */
export function formatAffinityInsight(eventProfile, userIntent, stops) {
  const bits = [];
  if (eventProfile?.reasons?.length) bits.push(...eventProfile.reasons.slice(0, 2));
  if (userIntent?.reasons?.length) bits.push(...userIntent.reasons.slice(0, 2));
  const fillers = (stops || []).filter((s) => s.kind === 'filler').map((s) => s.title);
  if (!bits.length && !fillers.length) return null;
  const why = bits.length ? bits.join(' · ') : 'mixed TDC picks';
  return `Matched to ${why}${fillers.length ? ` → ${fillers.join(' · ')}` : ''}`;
}

export { SLOT_TAGS };
