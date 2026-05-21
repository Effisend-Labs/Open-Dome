import { useState, useEffect } from 'react';
import { Blockchain, Wallet, Transfer, TransferToken, Location, Events } from './index';

/**
 * useOpenDome SDK Hook
 * Handles the secure handshake, token verification, and context synchronization.
 *
 * Session establishment priority:
 *  1. URL parameters (?pass=...&proof=...) — for direct-load / deep-link sessions
 *  2. postMessage handshake (OPENDOME_HANDSHAKE) — for iframe-embedded sessions
 *  3. EXPO_PUBLIC_OD_SKIP_AUTH fallback — for standalone debug mode
 */
export function useOpenDome(config = {}) {
  const [token, setToken] = useState(null);
  const [context, setContext] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [proxiedLocation, setProxiedLocation] = useState(null);

  // Initialize blockchain with provided config — stable reference, never re-created
  const [blockchain] = useState(() => new Blockchain(config.blockchain));

  useEffect(() => {
    // Local flag to avoid stale closure issues with isAuthorized state
    let authorized = false;

    // Always register message listener — handles both handshake AND location proxy
    const handleMessage = (event) => {
      if (!event.data) return;
      const { type, payload, context: incomingContext, status, error } = event.data;

      if (type === 'OPENDOME_HANDSHAKE') {
        if (status === 'UNAUTHORIZED' || error) {
          console.error('[Open-Dome SDK] Unauthorized token:', error);
          setIsAuthorized(false);
          window.parent.postMessage({
            type: 'OPEN_DOME_SDK_ERROR',
            error: error || 'INVALID_TOKEN'
          }, '*');
        } else {
          authorized = true;
          setToken(payload);
          setContext(incomingContext || {});
          setIsAuthorized(true);
          console.log('[Open-Dome SDK] Secure session established via postMessage.');
          window.parent.postMessage({
            type: 'OPEN_DOME_SDK_INIT',
            version: '1.0.0',
            status: 'AUTHORIZED',
            context: incomingContext || {}
          }, '*');
        }
        setLoading(false);
      }

      // Location proxy always works regardless of how session was established
      if (type === 'OPENDOME_LOCATION_UPDATE') {
        setProxiedLocation(payload);
      }
    };

    window.addEventListener('message', handleMessage);

    // --- Strategy 1: URL parameters (direct-load session) ---
    const params = new URLSearchParams(window.location.search);
    const pass = params.get('pass');

    if (pass) {
      const incomingContext = {};
      params.forEach((value, key) => {
        if (key !== 'pass' && key !== 'proof') incomingContext[key] = value;
      });
      authorized = true;
      setToken(pass);
      setContext(incomingContext);
      setIsAuthorized(true);
      setLoading(false);
      console.log('[Open-Dome SDK] Session established via URL parameters.');
      window.parent.postMessage({
        type: 'OPEN_DOME_SDK_INIT',
        version: '1.0.0',
        status: 'AUTHORIZED',
        context: incomingContext
      }, '*');

      // Listener stays active for location proxy — cleanup handles removal
      return () => window.removeEventListener('message', handleMessage);
    }

    // --- Strategy 2: postMessage handshake — signal ready ONCE ---
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'OPENDOME_READY',
        token: process.env.EXPO_PUBLIC_OD_DEBUG_TOKEN || null
      }, '*');
    }

    // --- Strategy 3: Standalone debug fallback ---
    const timeout = setTimeout(() => {
      if (!authorized && process.env.EXPO_PUBLIC_OD_SKIP_AUTH === 'true') {
        setToken('DEBUG_TOKEN');
        setContext({ username: 'DebugUser', theme: 'light', lang: 'en' });
        setIsAuthorized(true);
        setLoading(false);
        console.log('[Open-Dome SDK] Debug mode: session granted via EXPO_PUBLIC_OD_SKIP_AUTH.');
      }
    }, 2000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeout);
    };
  }, []); // Run once on mount — no re-triggers from state changes

  return { isAuthorized, token, context, loading, proxiedLocation, blockchain, Wallet, Transfer, TransferToken, Location, Events };
}
