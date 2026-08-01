export async function GET() {
  const storeApps = [
    { id: 'app1', name: 'Food',      icon: 'restaurant',   color: '#FF9500', description: 'Order food delivery directly to your seat.', publisher: 'Effisend Labs' },
    { id: 'app2', name: 'Map',       icon: 'map',          color: '#34C759', description: 'Interactive 3D map with live routing.', publisher: 'Effisend Labs' },
    { id: 'app3', name: 'Rides',     icon: 'rocket',       color: '#FF2D55', description: 'Book attraction queues dynamically.', publisher: 'Effisend Labs' },
    { id: 'app4', name: 'Merch',     icon: 'shirt',        color: '#AF52DE', description: 'Exclusive crypto-merchandise.', publisher: 'Effisend Labs' },
    { id: 'app5', name: 'Spa',       icon: 'water',        color: '#5AC8FA', description: 'Relaxation and massage bookings.', publisher: 'Effisend Labs' },
    { id: 'app6', name: 'Restrooms', icon: 'man',          color: '#8E8E93', description: 'Find the nearest open restrooms.', publisher: 'Effisend Labs' }
  ];

  return Response.json({ success: true, data: storeApps });
}
