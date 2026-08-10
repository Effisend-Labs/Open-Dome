import { Hono } from 'hono';
import { LocationLogs } from '../../utilsAPI/passkeyDb';

const app = new Hono();

app.get('/', async (c) => {
  try {
    // Attempt to get IP from headers
    let ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '';
    if (ip.includes(',')) ip = ip.split(',')[0].trim();

    // If local development, fetch public IP
    if (!ip || ip === '::1' || ip.includes('127.0.0.1') || ip === 'localhost') {
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipRes.json();
      ip = ipData.ip;
    }

    // Call GeoIP
    const geoRes = await fetch(`http://ip-api.com/json/${ip}`);
    const geoData = await geoRes.json();

    if (geoData.status !== 'success') {
      throw new Error("Failed to geolocate IP");
    }

    // Attempt to extract userId from auth header or query (if passed)
    const userId = c.req.query('userId') || 'anonymous';

    const locationPing = {
      userId,
      ip,
      latitude: geoData.lat,
      longitude: geoData.lon,
      city: geoData.city,
      country: geoData.country,
      timestamp: new Date().toISOString()
    };

    // Log to Firestore
    await LocationLogs.add(locationPing);

    return c.json({
      status: "success",
      data: {
        latitude: geoData.lat,
        longitude: geoData.lon,
        accuracy: "high",
        message: "Live location data retrieved and logged successfully."
      }
    });

  } catch (error) {
    console.error("[Location API] Error:", error);
    return c.json({
      status: "error",
      message: error.message
    }, 500);
  }
});

export default app;
