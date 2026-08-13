import { resolvePasskeyUserForScan, getTicketsByAddress } from '../../utilsAPI/adminDb';
import { verifyStaffActor } from '../../utilsAPI/staffJwt';
import fs from 'node:fs';
import path from 'node:path';

let eventsCache = null;

function loadEvents() {
  if (eventsCache) return eventsCache;
  const candidates = [
    path.join(process.cwd(), '..', '..', '..', 'open-dome-lib', 'src', 'dbs', 'events.json'),
    path.join(process.cwd(), '..', '..', 'open-dome-lib', 'src', 'dbs', 'events.json'),
    path.join(process.cwd(), 'src', 'core', 'dbs', 'events.json'),
  ];
  for (const p of candidates) {
    try {
      eventsCache = JSON.parse(fs.readFileSync(p, 'utf8'));
      return eventsCache;
    } catch {
      // next
    }
  }
  eventsCache = [];
  return eventsCache;
}

function populatePasses(tickets) {
  const allEvents = loadEvents();
  return tickets.map((ticket) => {
    const eventMeta = allEvents.find((e) => String(e.id) === String(ticket.ticketId));
    if (eventMeta) {
      return {
        name: eventMeta.title,
        image: eventMeta.thumbnail,
        description: `${eventMeta.category} at ${eventMeta.placeName}`,
        tokenId: ticket.ticketId,
        amount: ticket.amount,
        attributes: [
          { trait_type: 'Category', value: eventMeta.category },
          { trait_type: 'Venue', value: eventMeta.placeName },
        ],
        network: eventMeta.placeName || 'Base',
        chain: 'Base',
      };
    }
    return {
      name: `Pass #${ticket.ticketId}`,
      tokenId: ticket.ticketId,
      amount: ticket.amount,
      description: '',
      attributes: [],
      network: 'Base',
      chain: 'Base',
    };
  });
}

/**
 * Staff-only: resolve guest QR / wallet → profile + passes.
 * Body: { query: "opendome:user:x" | "@x" | "0x…" | solana }
 */
export async function POST(request) {
  const actor = await verifyStaffActor(request);
  if (!actor) {
    return Response.json(
      { error: 'Unauthorized — staff OpenDome JWT (scanner/admin/god) required' },
      { status: 401 }
    );
  }

  try {
    const { query } = await request.json();
    const profile = await resolvePasskeyUserForScan(query);
    if (!profile) {
      return Response.json({ error: 'No matching user or wallet' }, { status: 404 });
    }

    let passes = [];
    if (profile.evmAddress) {
      const tickets = await getTicketsByAddress(profile.evmAddress);
      passes = populatePasses(tickets);
    }

    return Response.json({
      success: true,
      profile: {
        id: profile.id,
        username: profile.username
          ? String(profile.username).replace(/^@/, '')
          : null,
        evmAddress: profile.evmAddress
          ? String(profile.evmAddress).toLowerCase()
          : null,
        solanaAddress: profile.solanaAddress || null,
        role: profile.role,
      },
      passes,
      scannedBy: { role: actor.role, username: actor.username || null },
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
