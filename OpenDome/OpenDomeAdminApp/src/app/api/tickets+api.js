import { getTicketsByAddress } from '../../utilsAPI/adminDb';
import fs from 'node:fs';
import path from 'node:path';

let eventsCache = null;

function loadEvents() {
  if (eventsCache) return eventsCache;
  const candidates = [
    path.join(process.cwd(), '..', '..', 'open-dome-lib', 'src', 'dbs', 'events.json'),
    path.join(process.cwd(), 'src', 'core', 'dbs', 'events.json'),
  ];
  for (const p of candidates) {
    try {
      eventsCache = JSON.parse(fs.readFileSync(p, 'utf8'));
      return eventsCache;
    } catch {
      // try next
    }
  }
  eventsCache = [];
  return eventsCache;
}

export async function GET(request) {
  const address = new URL(request.url).searchParams.get('address');
  if (!address) {
    return Response.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    const tickets = await getTicketsByAddress(address);
    const allEvents = loadEvents();

    const populated = tickets.map((ticket) => {
      const eventMeta = allEvents.find(
        (e) => String(e.id) === String(ticket.ticketId)
      );

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
            {
              trait_type: 'Date',
              value: new Date(eventMeta.from).toLocaleDateString(),
            },
          ],
          network: 'Server Bridge (ERC-1155)',
        };
      }

      return {
        name: `Pass #${ticket.ticketId}`,
        tokenId: ticket.ticketId,
        amount: ticket.amount,
        description: '',
        attributes: [],
        network: 'Server Bridge (ERC-1155)',
      };
    });

    return Response.json(populated);
  } catch (err) {
    console.error('[Tickets Error]', err);
    return Response.json([]);
  }
}
