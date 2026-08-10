import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import * as handlers from '../../api/handlers'; 

/**
 * Open-Dome Sandbox API HUB
 */

const app = new Hono().basePath('/api');

// 1. GLOBAL MIDDLEWARE
app.use('*', logger());
app.use('*', cors());

// 1.1 RATE LIMITING
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

app.use('*', async (c, next) => {
  const ip = c.req.header('x-forwarded-for') || 'anonymous_ip';
  const now = Date.now();
  
  let record = rateLimitMap.get(ip);
  if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    record = { count: 1, startTime: now };
  } else {
    record.count++;
  }
  rateLimitMap.set(ip, record);

  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    return c.json({ error: 'Too many requests, please try again later.' }, 429);
  }

  await next();
});

// 1.2 GLOBAL ERROR HANDLING (SECRET MASKING)
app.onError((err, c) => {
  // Log the raw error internally for debugging
  console.error('[OpenDome API Error - INTERNAL]:', err);

  // Ensure NO secrets or stack traces leak to the client response
  return c.json({
    status: 'error',
    message: 'An internal server error occurred. Please contact support.',
  }, 500);
});

// 2. AUTO-MOUNT THE ROUTES
Object.entries(handlers).forEach(([routeName, subApp]) => {
  app.route(`/${routeName}`, subApp);
});

// 3. EXPORT TO EXPO ROUTER
export const GET = (req) => app.fetch(req);
export const POST = (req) => app.fetch(req);
export const PUT = (req) => app.fetch(req);
export const DELETE = (req) => app.fetch(req);
export const PATCH = (req) => app.fetch(req);
