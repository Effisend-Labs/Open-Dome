import { Events } from './events.js';
import { formatTime, getAmenities } from './itinerary.js';
import {
  listUpcomingEvents,
  buildItineraryForEvent,
  resolveVenueFromMessage,
  DEFAULT_EVENT_VENUE,
} from './planner.js';

export const GOOGLE_SEARCH_TOOLS = [{ googleSearch: {} }];

export const DOME_CONSULTANT_PROMPT = `You are the OpenDome consultant for Tokyo Dome City (Tokyo, Japan). You help with venues, events, amenities, and day plans.

Use tools for every catalog or availability fact. For amenities, opening hours, or "open now" questions, call list_amenities and answer from its hours and openNow fields. Never turn an amenities question into a day plan.

Only call plan_day when the user explicitly asks for an itinerary or day plan. A day plan must be anchored to an eventId selected with search_events or get_event; if the user has not identified an event, ask them to choose one. Do not silently pick a baseball game or other event.

Do not invent showtimes or opening hours. Do not take payments, mint tickets, or move USDC — send people to Wallet / OpenAgent for that.

Voice: concise, specific, local. No receptionist filler.`;

export const DOME_CONSULTANT_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'search_events',
        description: 'Search Tokyo Dome City events by text, venue, or category.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING' },
            placeName: { type: 'STRING', description: 'e.g. Tokyo Dome, Korakuen Hall, IMM Theater' },
            category: { type: 'STRING' },
            limit: { type: 'NUMBER' },
          },
        },
      },
      {
        name: 'get_event',
        description: 'Get one event by numeric id.',
        parameters: {
          type: 'OBJECT',
          properties: { id: { type: 'NUMBER' } },
          required: ['id'],
        },
      },
      {
        name: 'list_places',
        description: 'List known venues and amenity places in Tokyo Dome City.',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'list_amenities',
        description:
          'List TDC amenities with Tokyo opening hours and whether each is open now. Use for amenities, hours, availability, spa, attractions, and food questions.',
        parameters: {
          type: 'OBJECT',
          properties: { tag: { type: 'STRING' } },
        },
      },
      {
        name: 'plan_day',
        description:
          'Build a Pulse/Zen/Curator/Local day plan around a specific event. Use only for an explicit itinerary request after selecting an event.',
        parameters: {
          type: 'OBJECT',
          properties: {
            eventId: { type: 'NUMBER' },
            userText: { type: 'STRING' },
          },
          required: ['eventId'],
        },
      },
    ],
  },
];

export const WALLET_CIRCLE_PROMPT = `You are the OpenDome Wallet agent. You operate Circle developer-controlled wallets for the signed-in user.

Use Circle tools for balances, wallets, transfers, fees, and tx history. List or estimate before sending. Never claim a transfer succeeded unless create_transaction returned an id or txHash. Default token is USDC.

The signed-in user typically has Circle wallets on Base, Arbitrum, Optimism, Polygon, Avalanche, Ethereum, and Solana. For SOL / Solana questions, call tools with blockchain SOL (not Base). Never say they have no Solana wallet if list_wallets returned a SOL chain.

When the user asks for a balance without naming a chain, call list_wallets (omit blockchain) and report USDC on every returned chain. Prefer the compact usdc field. Format as a short list, e.g.:
- Base: 0.50 USDC
- Arbitrum: 0 USDC
- Solana: 1.2 USDC
When they name a chain, query that chain only and reply like "0.48 USDC on Base". Do not include wallet addresses, wallet ids, or explorer links unless they explicitly ask for the address.

USDC spend lives on each chain separately. Portfolio may show USDC on Base, Arb, OP, Polygon, Avalanche, Ethereum, and/or Solana.

Transfer policy:
- EVM L2s (BASE, ARB, OP, MATIC, AVAX) → same-chain 0x sends are facilitator-sponsored (EIP-3009). User only needs USDC. Pass blockchain accordingly.
- Ethereum (ETH) → same-chain 0x send via Circle createTransaction; user must have ETH for gas. Do not claim it is gasless.
- Solana (SOL) → same-chain Solana USDC send; OpenDome's Solana facilitator pays the network fee.
- Base → Solana address → CCTP bridge from Base USDC (small USDC bridge fee). Do not refuse this. Other L2s cannot bridge to Solana in v1.

When the user wants to receive Solana USDC via QR (Phantom / Solana Pay scan), call create_solana_pay with the USDC amount. Recipient defaults to their Circle Solana wallet. Tell them to scan the QR in Phantom. Never invent a solana: URL. Never paste the raw solana: payment URL into chat text — the app renders the QR from the tool result.

Do not plan Tokyo Dome itineraries. Do not charge a per-prompt fee.`;

export const WALLET_CIRCLE_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'list_wallets',
        description:
          'List the signed-in user Circle wallets with token balances on every chain (Base, Arb, OP, Polygon, Avalanche, Ethereum, Solana). Each row includes usdc.',
        parameters: {
          type: 'OBJECT',
          properties: {
            blockchain: {
              type: 'STRING',
              description: 'BASE, ARB, OP, MATIC, AVAX, ETH, or SOL. Omit to return all chains.',
            },
          },
        },
      },
      {
        name: 'get_wallet',
        description: 'Get one wallet by id.',
        parameters: {
          type: 'OBJECT',
          properties: { walletId: { type: 'STRING' } },
          required: ['walletId'],
        },
      },
      {
        name: 'get_wallet_token_balance',
        description:
          'Token balances for a wallet. Omit walletId and blockchain to fetch USDC on all user chains. Pass blockchain (BASE/ARB/OP/MATIC/AVAX/ETH/SOL) when walletId is unknown.',
        parameters: {
          type: 'OBJECT',
          properties: {
            walletId: { type: 'STRING' },
            blockchain: {
              type: 'STRING',
              description: 'BASE, ARB, OP, MATIC, AVAX, ETH, or SOL. Omit with no walletId for all chains.',
            },
          },
        },
      },
      {
        name: 'get_wallet_nft_balance',
        description:
          'NFTs for one Circle wallet, or all of the signed-in user wallets (one Circle call per chain). Paginates and includes unmonitored collections.',
        parameters: {
          type: 'OBJECT',
          properties: {
            walletId: { type: 'STRING' },
            blockchain: {
              type: 'STRING',
              description: 'BASE, SOL, ETH, OP, ARB, MATIC, AVAX. Omit with no walletId to list every chain.',
            },
          },
        },
      },
      {
        name: 'list_transactions',
        description: 'List recent Circle transactions.',
        parameters: {
          type: 'OBJECT',
          properties: {
            walletId: { type: 'STRING' },
            blockchain: { type: 'STRING' },
          },
        },
      },
      {
        name: 'get_transaction',
        description: 'Get one transaction by id.',
        parameters: {
          type: 'OBJECT',
          properties: { transactionId: { type: 'STRING' } },
          required: ['transactionId'],
        },
      },
      {
        name: 'estimate_transfer_fee',
        description:
          'Estimate fee for a USDC transfer. Sponsored L2s and Solana report userFee 0. Ethereum is user-paid gas.',
        parameters: {
          type: 'OBJECT',
          properties: {
            walletId: { type: 'STRING' },
            destination: { type: 'STRING' },
            amount: { type: 'STRING' },
            tokenId: { type: 'STRING' },
            blockchain: {
              type: 'STRING',
              description: 'BASE, ARB, OP, MATIC, AVAX, ETH, or SOL',
            },
          },
          required: ['destination', 'amount'],
        },
      },
      {
        name: 'validate_address',
        description: 'Validate a blockchain address.',
        parameters: {
          type: 'OBJECT',
          properties: {
            address: { type: 'STRING' },
            blockchain: { type: 'STRING' },
          },
          required: ['address', 'blockchain'],
        },
      },
      {
        name: 'create_wallets',
        description: 'Create a developer-controlled EOA wallet.',
        parameters: {
          type: 'OBJECT',
          properties: {
            blockchains: { type: 'ARRAY', items: { type: 'STRING' } },
          },
          required: ['blockchains'],
        },
      },
      {
        name: 'create_transaction',
        description:
          'Send USDC. Pass blockchain for the source chain. L2s and Solana are gasless through facilitators. Ethereum requires native gas. Solana dest from Base uses CCTP.',
        parameters: {
          type: 'OBJECT',
          properties: {
            amount: { type: 'STRING' },
            destination: { type: 'STRING' },
            tokenId: { type: 'STRING' },
            walletId: { type: 'STRING' },
            blockchain: {
              type: 'STRING',
              description: 'BASE, ARB, OP, MATIC, AVAX, ETH, or SOL. Default BASE.',
            },
          },
          required: ['amount', 'destination'],
        },
      },
      {
        name: 'create_solana_pay',
        description:
          'Create a Solana Pay QR request so someone can pay native Solana USDC into the signed-in user Circle Solana wallet (Phantom scan).',
        parameters: {
          type: 'OBJECT',
          properties: {
            amount: {
              type: 'STRING',
              description: 'USDC amount, e.g. "0.50"',
            },
            recipient: {
              type: 'STRING',
              description: 'Optional Solana address. Defaults to the user Circle Solana wallet.',
            },
            label: { type: 'STRING' },
            message: { type: 'STRING' },
          },
          required: ['amount'],
        },
      },
      {
        name: 'sign_message',
        description: 'Sign a message with a Circle wallet.',
        parameters: {
          type: 'OBJECT',
          properties: {
            walletId: { type: 'STRING' },
            message: { type: 'STRING' },
          },
          required: ['walletId', 'message'],
        },
      },
      {
        name: 'get_token',
        description: 'Look up a Circle token by id.',
        parameters: {
          type: 'OBJECT',
          properties: { tokenId: { type: 'STRING' } },
          required: ['tokenId'],
        },
      },
    ],
  },
];

function summarizeEvent(event) {
  if (!event) return null;
  return {
    id: event.id,
    title: event.title,
    placeName: event.placeName,
    category: event.category,
    from: event.from,
    fromTime: event.fromTime,
  };
}

function getTokyoClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  return {
    label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    minutes: hour * 60 + minute,
  };
}

function isOpenAt(amenity, minutes) {
  const opens = Number(amenity.openFromMinutes);
  const closes = Number(amenity.openToMinutes);
  if (!Number.isFinite(opens) || !Number.isFinite(closes)) return null;
  if (opens === closes) return true;
  if (closes > opens) return minutes >= opens && minutes < closes;
  return minutes >= opens || minutes < closes;
}

export function runDomeConsultantTool(name, args = {}) {
  if (name === 'search_events') {
    const placeName = args.placeName || resolveVenueFromMessage(args.query || '', DEFAULT_EVENT_VENUE);
    const rows = args.query || args.category
      ? Events.search({
          query: args.query,
          placeName: args.placeName,
          category: args.category,
          limit: args.limit || 8,
        })
      : listUpcomingEvents({ placeName, limit: args.limit || 5 });
    return { events: rows.map(summarizeEvent) };
  }
  if (name === 'get_event') {
    return { event: summarizeEvent(Events.getById(args.id)) };
  }
  if (name === 'list_places') {
    const fromEvents = Events.getAll().map((e) => e.placeName).filter(Boolean);
    const fromAmenities = getAmenities().map((a) => a.placeName || a.name);
    return { places: [...new Set([...fromEvents, ...fromAmenities])] };
  }
  if (name === 'list_amenities') {
    const tag = String(args.tag || '').toLowerCase();
    const rows = getAmenities().filter((a) => !tag || (a.tags || []).includes(tag));
    const tokyoClock = getTokyoClock();
    return {
      timeZone: 'Asia/Tokyo',
      currentTime: tokyoClock.label,
      amenities: rows.map((a) => ({
        id: a.id,
        name: a.name,
        placeName: a.placeName,
        tags: a.tags,
        description: a.description,
        priceUsd: a.priceUsd,
        opensAt: formatTime(a.openFromMinutes),
        closesAt: formatTime(a.openToMinutes),
        openNow: isOpenAt(a, tokyoClock.minutes),
      })),
    };
  }
  if (name === 'plan_day') {
    if (args.eventId == null) {
      return { error: 'Choose an event before requesting a day plan.' };
    }
    const event = Events.getById(args.eventId);
    if (!event) {
      return { error: `Event ${args.eventId} was not found.` };
    }
    const proposal = buildItineraryForEvent(event, { userText: args.userText });
    if (!proposal) return { error: 'Could not build a day plan' };
    return {
      title: proposal.title,
      subtitle: proposal.subtitle,
      dateLabel: proposal.dateLabel,
      insight: proposal.insight,
      winner: proposal.winner?.name,
      stops: (proposal.stops || []).map((s) => ({
        slot: s.slot,
        name: s.name || s.title,
        time: s.timeLabel || s.time,
      })),
    };
  }
  return { error: `Unknown consultant tool: ${name}` };
}

export function resolveAgentMode(body = {}) {
  const raw = String(body.mode || body.app || '').toLowerCase();
  if (raw === 'openagent') return 'openagent';
  if (raw === 'wallet') return 'wallet';
  return 'dome';
}
