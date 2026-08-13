import { getTicketsByAddress } from '../../utilsAPI/ticketsDb';
import { presentTickets } from '../../utilsAPI/ticketsPresent';

export async function GET(request) {
  const address = new URL(request.url).searchParams.get('address');
  if (!address) {
    return Response.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    const tickets = await getTicketsByAddress(address);
    const populated = presentTickets(tickets, address);
    console.log(
      `[Host Tickets] ${address} → ${populated.length} pass(es)`,
    );
    return Response.json(populated);
  } catch (err) {
    console.error('[Host Tickets]', err.message);
    return Response.json([]);
  }
}
