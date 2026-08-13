import amenitiesData from 'opendome/src/dbs/amenities.json';
import { Events } from 'opendome';

/**
 * Human-readable mint targets. Token IDs stay under the hood.
 */

export function listAmenityPasses() {
  return (amenitiesData || []).map((a) => ({
    kind: 'amenity',
    key: `amenity-${a.id}`,
    tokenId: Number(a.tokenId),
    label: a.name,
    subtitle: a.placeName || 'Amenity pass',
  }));
}

/** Upcoming + recent events (by start time), optionally filtered. */
export function searchEventPasses(query = '', limit = 48) {
  const q = String(query || '').trim().toLowerCase();
  const now = Date.now();
  const from = now - 7 * 24 * 60 * 60 * 1000;
  let rows = Events.search({
    from,
    query: q || undefined,
    limit: Math.max(limit * 3, 80),
  });

  if (!rows.length && q) {
    rows = Events.search({ query: q, limit });
  } else if (!rows.length) {
    rows = Events.search({ limit });
  }

  return rows.slice(0, limit).map((e) => ({
    kind: 'event',
    key: `event-${e.id}`,
    tokenId: Number(e.id),
    label: e.title,
    subtitle: [e.placeName, e.category, e.fromTime || e.from]
      .filter(Boolean)
      .join(' · '),
  }));
}

export function buildPassCatalog({ query = '', kind = 'all' } = {}) {
  const amenities = kind === 'event' ? [] : listAmenityPasses();
  const events = kind === 'amenity' ? [] : searchEventPasses(query);

  const amenityFiltered = query
    ? amenities.filter((a) => {
        const blob = `${a.label} ${a.subtitle} ${a.tokenId}`.toLowerCase();
        return blob.includes(String(query).toLowerCase());
      })
    : amenities;

  return {
    amenities: amenityFiltered,
    events,
  };
}
