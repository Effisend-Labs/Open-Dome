import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import eventsData from '@/db.json'; // Wait, events are where? Oh, admin-app/app/api/events/route.js might have them or we can just read events.json.
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  const db = getDb();
  const user = db.users.find(u => u.address.toLowerCase() === address.toLowerCase());

  if (!user || !user.tickets) {
    return NextResponse.json([]);
  }

  // Load events data
  let allEvents = [];
  try {
    const eventsPath = path.join(process.cwd(), '..', 'open-dome-lib', 'src', 'dbs', 'events.json');
    const eventsRaw = fs.readFileSync(eventsPath, 'utf8');
    allEvents = JSON.parse(eventsRaw);
  } catch (err) {
    console.error('Error loading events.json', err);
  }

  // Map user tickets to full metadata
  const populatedTickets = user.tickets.map(ticket => {
    const eventMeta = allEvents.find(e => String(e.id) === String(ticket.id));
    
    if (eventMeta) {
      return {
        name: eventMeta.title,
        image: eventMeta.thumbnail,
        description: `${eventMeta.category} at ${eventMeta.placeName}`,
        tokenId: ticket.id,
        amount: ticket.amount,
        attributes: [
          { trait_type: "Category", value: eventMeta.category },
          { trait_type: "Venue", value: eventMeta.placeName },
          { trait_type: "Date", value: new Date(eventMeta.from).toLocaleDateString() }
        ],
        network: 'Server Bridge (ERC-1155)'
      };
    }
    
    return {
      name: `Pass #${ticket.id}`,
      tokenId: ticket.id,
      amount: ticket.amount,
      description: '',
      attributes: [],
      network: 'Server Bridge (ERC-1155)'
    };
  });

  return NextResponse.json(populatedTickets);
}
