import { sleep } from './councilDrama';

export const FULFILL_PHASES = {
  RESERVING: 'reserving',
  CONFIRMING: 'confirming',
  PAYING: 'paying',
  DONE: 'done',
};

export function isConfirmBookingIntent(text) {
  const t = String(text || '').trim();
  if (!t) return false;
  return (
    /^(ok|okay|yes|yep|y|confirm|book it|book this|go ahead|approve|do it)\b/i.test(t) ||
    /\b(ok|okay|yes),?\s*(book|confirm|pay|reserve)\b/i.test(t)
  );
}

function holdCode(stop, index) {
  const raw = String(stop.amenityId || stop.id || `s${index}`).replace(/[^a-z0-9]/gi, '');
  return `TDC-${raw.slice(0, 4).toUpperCase()}${String(index + 1).padStart(2, '0')}`;
}

export function buildVenueHolds(proposal) {
  return (proposal?.stops || [])
    .filter((stop) => stop.enabled !== false)
    .map((stop, index) => ({
      id: String(stop.amenityId || stop.id || `stop-${index}`),
      title: stop.title,
      placeName: stop.placeName,
      slot: `${stop.startTime} – ${stop.endTime}`,
      kind: stop.kind,
      status: 'idle',
      holdCode: holdCode(stop, index),
    }));
}

/**
 * Visible booking run after the guest says OK.
 * Emulates per-venue holds, venue confirmations, then a unified payment.
 */
export async function playFulfillmentSequence(holds, { onUpdate, totalLabel, signal } = {}) {
  let venues = holds.map((h) => ({ ...h }));

  const emit = (phase, patch = {}) => {
    if (signal?.aborted) throw new Error('aborted');
    onUpdate?.({
      phase,
      venues: venues.map((v) => ({ ...v })),
      ...patch,
    });
  };

  emit(FULFILL_PHASES.RESERVING, {
    note: 'Holding slots at each venue…',
  });

  for (let i = 0; i < venues.length; i++) {
    venues = venues.map((v, idx) => (idx === i ? { ...v, status: 'holding' } : v));
    emit(FULFILL_PHASES.RESERVING, {
      note: `Requesting hold · ${venues[i].placeName}`,
    });
    await sleep(620);

    venues = venues.map((v, idx) => (idx === i ? { ...v, status: 'reserved' } : v));
    emit(FULFILL_PHASES.RESERVING, {
      note: `${venues[i].placeName} held · ${venues[i].holdCode}`,
    });
    await sleep(380);
  }

  emit(FULFILL_PHASES.CONFIRMING, {
    note: 'Venues confirming inventory…',
  });
  await sleep(700);

  venues = venues.map((v) => ({ ...v, status: 'confirmed' }));
  emit(FULFILL_PHASES.CONFIRMING, {
    note: 'All places confirmed. Bundling one USDC payment…',
  });
  await sleep(650);

  emit(FULFILL_PHASES.PAYING, {
    note: `Unified checkout · ${totalLabel || 'total'} USDC`,
    payingLabel: `One payment for ${venues.length} reservations + NFT mint`,
  });
  await sleep(800);
}
