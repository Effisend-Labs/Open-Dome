import { Events } from './events';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit');
    
    // Default to a simple getAll if no complex query, or we can use search
    const allEvents = Events.getAll();
    
    let result = allEvents;
    if (limit) {
      result = result.slice(0, parseInt(limit, 10));
    }
    
    return Response.json({ success: true, data: result });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
