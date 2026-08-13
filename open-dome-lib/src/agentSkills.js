import { Events } from './events.js';
import { getAmenities } from './itinerary.js';
import {
  listUpcomingEvents,
  buildItineraryForEvent,
  resolveVenueFromMessage,
  DEFAULT_EVENT_VENUE,
} from './planner.js';

export const GOOGLE_SEARCH_TOOLS = [{ googleSearch: {} }];

export const DOME_CONSULTANT_PROMPT = `You are the OpenDome consultant for Tokyo Dome City (Tokyo, Japan). You help with venues, events, amenities, and day plans.

Use tools for catalog facts. Do not invent showtimes. Do not take payments, mint tickets, or move USDC — send people to Wallet / OpenAgent for that.

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
        description: 'List TDC amenities (spa, batting, TeNQ, food, etc).',
        parameters: {
          type: 'OBJECT',
          properties: { tag: { type: 'STRING' } },
        },
      },
      {
        name: 'plan_day',
        description: 'Build a Pulse/Zen/Curator/Local day plan around a show.',
        parameters: {
          type: 'OBJECT',
          properties: {
            eventId: { type: 'NUMBER' },
            placeName: { type: 'STRING' },
            userText: { type: 'STRING' },
          },
        },
      },
    ],
  },
];

export const WALLET_CIRCLE_PROMPT = `You are the OpenDome Wallet agent. You operate Circle developer-controlled wallets for the signed-in user.

Use Circle tools for balances, wallets, transfers, fees, and tx history. List or estimate before sending. Never claim a transfer succeeded unless create_transaction returned an id or txHash. Default chain is Base; default token is USDC.

The signed-in user typically has BOTH a Base wallet and a Solana wallet. For SOL / Solana questions, call tools with blockchain SOL (not Base). Never say they have no Solana wallet if list_wallets returned a SOL chain.

When the user asks for a balance, reply with the amount and token only (e.g. "0.48 USDC on Base" or "0 SOL on Solana"). Do not include wallet addresses, wallet ids, or explorer links unless they explicitly ask for the address.

USDC the user holds for spend lives on Base. They also have a Solana wallet — Portfolio showing Solana/SOL means that wallet exists even if Solana USDC is 0.00.

To send USDC onto Solana, call create_transaction with destination set to the Solana address (base58). The host bridges Base USDC to native Solana USDC via Circle CCTP. Do not refuse this. Do not ask for an Ethereum 0x destination when they want Solana. Same-chain Base sends still use a 0x address and are gasless (EIP-3009). CCTP to Solana burns on Base and mints on Solana; a small USDC bridge fee applies.

Do not plan Tokyo Dome itineraries. Do not charge a per-prompt fee.`;

export const WALLET_CIRCLE_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'list_wallets',
        description: 'List the signed-in user Circle wallets (Base and Solana) with token balances.',
        parameters: {
          type: 'OBJECT',
          properties: {
            blockchain: {
              type: 'STRING',
              description: 'BASE or SOL. Omit to return both.',
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
        description: 'Token balances for a wallet. Pass blockchain SOL for Solana or BASE for Base if walletId is unknown.',
        parameters: {
          type: 'OBJECT',
          properties: {
            walletId: { type: 'STRING' },
            blockchain: { type: 'STRING', description: 'BASE or SOL' },
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
          'Estimate fee for a USDC transfer. USDC on Base is facilitator-sponsored (userFee is 0).',
        parameters: {
          type: 'OBJECT',
          properties: {
            walletId: { type: 'STRING' },
            destination: { type: 'STRING' },
            amount: { type: 'STRING' },
            tokenId: { type: 'STRING' },
          },
          required: ['walletId', 'destination', 'amount'],
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
          'Send USDC. Destination may be a Base 0x address (same-chain, gasless) or a Solana address (CCTP bridge from Base USDC).',
        parameters: {
          type: 'OBJECT',
          properties: {
            amount: { type: 'STRING' },
            destination: { type: 'STRING' },
            tokenId: { type: 'STRING' },
            walletId: { type: 'STRING' },
          },
          required: ['amount', 'destination'],
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
    return {
      amenities: rows.map((a) => ({
        id: a.id,
        name: a.name,
        tags: a.tags,
        description: a.description,
        priceUsd: a.priceUsd,
      })),
    };
  }
  if (name === 'plan_day') {
    const event =
      (args.eventId != null ? Events.getById(args.eventId) : null) ||
      listUpcomingEvents({
        placeName: args.placeName || DEFAULT_EVENT_VENUE,
        limit: 1,
      })[0];
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
