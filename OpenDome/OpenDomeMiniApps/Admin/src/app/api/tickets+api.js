import { getTicketsByAddress } from '../../utilsAPI/adminDb';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_CONTRACT =
  process.env.CONTRACT_ADDRESS || '0x40c39F091a7c85D10B8C46762b59Df3eCd77630C';
const BASESCAN = 'https://basescan.org';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

function json(data, status = 200) {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

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
      // try next
    }
  }
  eventsCache = [];
  return eventsCache;
}

function resolveExplorer(ticket, address) {
  const owner = String(address || ticket.address || '').toLowerCase();
  const contractAddress = ticket.contractAddress || DEFAULT_CONTRACT;
  const mintTxHash = ticket.mintTxHash || null;
  const paymentTxHash = ticket.paymentTxHash || null;
  const stored = ticket.explorer || {};

  return {
    mintTxUrl:
      stored.mintTxUrl ||
      (mintTxHash ? `${BASESCAN}/tx/${mintTxHash}` : null),
    paymentTxUrl:
      stored.paymentTxUrl ||
      (paymentTxHash ? `${BASESCAN}/tx/${paymentTxHash}` : null),
    tokenInventoryUrl:
      stored.tokenInventoryUrl ||
      (owner
        ? `${BASESCAN}/token/${contractAddress}?a=${owner}`
        : `${BASESCAN}/token/${contractAddress}`),
    ownerAddressUrl:
      stored.ownerAddressUrl ||
      (owner ? `${BASESCAN}/address/${owner}` : null),
  };
}

export async function GET(request) {
  const address = new URL(request.url).searchParams.get('address');
  if (!address) {
    return json({ error: 'Address is required' }, 400);
  }

  try {
    const tickets = await getTicketsByAddress(address);
    const allEvents = loadEvents();

    const populated = tickets.map((ticket) => {
      const eventMeta = allEvents.find(
        (e) => String(e.id) === String(ticket.ticketId),
      );
      const explorer = resolveExplorer(ticket, address);
      const contractAddress = ticket.contractAddress || DEFAULT_CONTRACT;

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
          network: 'base',
          chain: 'Base',
          contractAddress,
          mintTxHash: ticket.mintTxHash || null,
          paymentTxHash: ticket.paymentTxHash || null,
          explorer,
          mintTxUrl: explorer.mintTxUrl,
          tokenInventoryUrl: explorer.tokenInventoryUrl,
        };
      }

      return {
        name: `Pass #${ticket.ticketId}`,
        tokenId: ticket.ticketId,
        amount: ticket.amount,
        description: '',
        attributes: [],
        network: 'base',
        chain: 'Base',
        contractAddress,
        mintTxHash: ticket.mintTxHash || null,
        paymentTxHash: ticket.paymentTxHash || null,
        explorer,
        mintTxUrl: explorer.mintTxUrl,
        tokenInventoryUrl: explorer.tokenInventoryUrl,
      };
    });

    return json(populated);
  } catch (err) {
    console.error('[Tickets Error]', err);
    return json([]);
  }
}
