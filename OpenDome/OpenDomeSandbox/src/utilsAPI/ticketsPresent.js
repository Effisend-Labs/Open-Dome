import { nodeRequire } from './nodeRequire';

const DEFAULT_CONTRACT =
  process.env.CONTRACT_ADDRESS || '0xf5053b8bAfc35c52DbED12c38Ef4c8AEb75999FF';
const BASESCAN = 'https://basescan.org';

let eventsCache = null;
let amenitiesCache = null;

function loadJson(rel) {
  try {
    return nodeRequire(`opendome/dist/dbs/${rel}`);
  } catch {
    try {
      return nodeRequire(`opendome/src/dbs/${rel}`);
    } catch {
      return [];
    }
  }
}

function loadEvents() {
  if (!eventsCache) eventsCache = loadJson('events.json');
  return Array.isArray(eventsCache) ? eventsCache : [];
}

function loadAmenities() {
  if (!amenitiesCache) amenitiesCache = loadJson('amenities.json');
  return Array.isArray(amenitiesCache) ? amenitiesCache : [];
}

function resolveExplorer(ticket, address) {
  const owner = String(address || ticket.address || '').toLowerCase();
  const contractAddress = ticket.contractAddress || DEFAULT_CONTRACT;
  const mintTxHash = ticket.mintTxHash || null;
  const paymentTxHash = ticket.paymentTxHash || null;
  const stored = ticket.explorer || {};

  return {
    mintTxUrl:
      stored.mintTxUrl || (mintTxHash ? `${BASESCAN}/tx/${mintTxHash}` : null),
    paymentTxUrl:
      stored.paymentTxUrl ||
      (paymentTxHash ? `${BASESCAN}/tx/${paymentTxHash}` : null),
    tokenInventoryUrl:
      stored.tokenInventoryUrl ||
      (owner
        ? `${BASESCAN}/token/${contractAddress}?a=${owner}`
        : `${BASESCAN}/token/${contractAddress}`),
    ownerAddressUrl:
      stored.ownerAddressUrl || (owner ? `${BASESCAN}/address/${owner}` : null),
  };
}

function presentBase(ticket, address, extra) {
  const explorer = resolveExplorer(ticket, address);
  const contractAddress = ticket.contractAddress || DEFAULT_CONTRACT;
  return {
    tokenId: ticket.ticketId,
    amount: ticket.amount,
    network: 'base',
    chain: 'Base',
    contractAddress,
    mintTxHash: ticket.mintTxHash || null,
    paymentTxHash: ticket.paymentTxHash || null,
    explorer,
    mintTxUrl: explorer.mintTxUrl,
    tokenInventoryUrl: explorer.tokenInventoryUrl,
    ...extra,
  };
}

export function presentTickets(tickets, address) {
  const allEvents = loadEvents();
  const allAmenities = loadAmenities();

  return (tickets || []).map((ticket) => {
    const eventMeta = allEvents.find(
      (e) => String(e.id) === String(ticket.ticketId),
    );
    if (eventMeta) {
      return presentBase(ticket, address, {
        name: eventMeta.title,
        image: eventMeta.thumbnail || null,
        description: `${eventMeta.category} at ${eventMeta.placeName}`,
        category: eventMeta.category,
        placeName: eventMeta.placeName,
        attributes: [
          { trait_type: 'Category', value: eventMeta.category },
          { trait_type: 'Venue', value: eventMeta.placeName },
          {
            trait_type: 'Date',
            value: new Date(eventMeta.from).toLocaleDateString(),
          },
        ],
      });
    }

    const amenity = allAmenities.find(
      (a) =>
        String(a.tokenId) === String(ticket.ticketId) ||
        a.id === ticket.amenityId,
    );
    if (amenity || ticket.passType === 'amenity') {
      const category = amenity?.tags?.[0] || 'amenity';
      const placeName = amenity?.placeName || ticket.placeName || 'Tokyo Dome City';
      return presentBase(ticket, address, {
        name: ticket.title || amenity?.name || `Pass #${ticket.ticketId}`,
        image: null,
        description: amenity?.description || `${category} at ${placeName}`,
        category,
        placeName,
        attributes: [
          { trait_type: 'Category', value: category },
          { trait_type: 'Venue', value: placeName },
        ],
      });
    }

    return presentBase(ticket, address, {
      name: ticket.title || `Pass #${ticket.ticketId}`,
      description: '',
      category: null,
      placeName: null,
      attributes: [],
    });
  });
}
