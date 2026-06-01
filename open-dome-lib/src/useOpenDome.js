import { useState, useEffect } from 'react';
import { Blockchain, Wallet, Transfer, TransferToken } from './blockchain';
import { Location } from './location';
import { Events } from './events';
import { Communication } from './communication';

const ALLOWED_ORIGINS = ['https://opendome.expo.app', 'http://localhost:8081'];

const isLocalhostOrigin = (urlStr) => {
  try {
    const url = new URL(urlStr);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch (e) {
    return urlStr.includes('localhost') || urlStr.includes('127.0.0.1');
  }
};

const checkOrigin = (origin) => {
  const normalized = origin.replace(/\/$/, '');
  if (ALLOWED_ORIGINS.includes(normalized)) return true;
  if (isLocalhostOrigin(normalized)) return true;
  return false;
};

// Global state singleton to unify multiple hook mounts
let globalToken = null;
let globalUser = null;
let globalContext = null;
let globalIsAuthorized = false;
let globalLoading = true;
let globalProxiedLocation = null;
let globalHandshakeInitiated = false;
let globalParentOrigin = null;

const subscribers = new Set();

const updateSubscribers = () => {
  subscribers.forEach(fn => {
    try {
      fn({
        token: globalToken,
        user: globalUser,
        context: globalContext,
        isAuthorized: globalIsAuthorized,
        loading: globalLoading,
        proxiedLocation: globalProxiedLocation
      });
    } catch (e) {
      // safe ignore
    }
  });
};

/**
 * useOpenDome SDK Hook
 * Handles the secure handshake, token verification, and context synchronization.
 * Uses a shared state pattern to prevent duplicate handshakes on multiple component mounts.
 */
export function useOpenDome(config = {}) {
  // Automatically sync appId with the Communication singleton
  const appId = config.appId || (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_OD_APP_ID : null);
  if (appId) {
    Communication.appId = appId;
  }

  const [state, setState] = useState({
    token: globalToken,
    user: globalUser,
    context: globalContext,
    isAuthorized: globalIsAuthorized,
    loading: globalLoading,
    proxiedLocation: globalProxiedLocation
  });

  // Initialize blockchain with provided config — stable reference, never re-created
  const [blockchain] = useState(() => new Blockchain(config.blockchain));

  const getTargetOrigin = () => {
    try {
      // 1. Try to read parentOrigin from query parameters (passed by sandbox)
      if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const paramOrigin = params.get('parentOrigin');
        if (paramOrigin) {
          return paramOrigin.replace(/\/$/, '');
        }
      }

      // 2. Fall back to window.location.ancestorOrigins if available
      if (typeof window !== 'undefined' && window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0) {
        return window.location.ancestorOrigins[0];
      }

      // 3. Fall back to defaults
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8081';
      }
      return 'https://opendome.expo.app';
    } catch (e) {
      return 'https://opendome.expo.app';
    }
  };

  const getParentOrigin = () => {
    return globalParentOrigin || getTargetOrigin();
  };

  const register = (username) => {
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'OPENDOME_REGISTER_REQUEST',
        payload: { username }
      }, getParentOrigin());
    } else {
      console.warn('[Open-Dome SDK] Not running in parent window context.');
    }
  };

  const login = () => {
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'OPENDOME_LOGIN_REQUEST'
      }, getParentOrigin());
    } else {
      console.warn('[Open-Dome SDK] Not running in parent window context.');
    }
  };

  const logout = () => {
    globalToken = null;
    globalUser = null;
    // Preserve environment context (theme, lang, etc.) — strip only the
    // auth-specific wsJwt so the UI doesn't revert to defaults on logout.
    if (globalContext) {
      const { wsJwt, ...envContext } = globalContext;
      globalContext = envContext;
    }
    globalIsAuthorized = false;
    globalLoading = false;
    updateSubscribers();

    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'OPENDOME_LOGOUT'
      }, getParentOrigin());
    }
  };

  useEffect(() => {
    subscribers.add(setState);

    // Initial load: If standalone (not in iframe), resolve loading instantly
    if (typeof window !== 'undefined' && window.parent === window) {
      globalLoading = false;
      if (process.env.EXPO_PUBLIC_OD_SKIP_AUTH === 'true' && !globalToken) {
        globalToken = 'DEBUG_TOKEN';
        globalUser = {
          username: 'DebugUser',
          evmAddress: '0xb90513424b01eA257bF8f87223A6eD8fe0Ce0681',
          solanaAddress: 'FUL1iK9p2jotYhjPAodbzbNQ5fmHWEyDa6RrBuy6tt8u'
        };
        globalContext = { theme: 'light', lang: 'en' };
        globalIsAuthorized = true;
      }
      updateSubscribers();
    }

    // Only initiate handshake on the very first hook mount in an iframe
    if (typeof window !== 'undefined' && window.parent !== window && !globalHandshakeInitiated) {
      globalHandshakeInitiated = true;

      const appToken = config.appToken || config.token || (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_OD_DEBUG_TOKEN : null);
      const appId = config.appId || (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_OD_APP_ID : null);

      const handleMessage = (event) => {
        if (!event.data) return;
        if (event.source !== window.parent) return;

        const normalizedOrigin = event.origin.replace(/\/$/, '');
        if (!checkOrigin(normalizedOrigin)) return;

        // Dynamically capture parent origin
        globalParentOrigin = event.origin;

        const { type, payload, user: incomingUser, context: incomingContext, status, error } = event.data;

        if (type === 'OPENDOME_HANDSHAKE') {
          if (status === 'UNAUTHORIZED' || error) {
            console.error('[Open-Dome SDK] Handshake unauthorized:', error);
            globalIsAuthorized = false;
            globalLoading = false;
            updateSubscribers();
            window.parent.postMessage({
              type: 'OPEN_DOME_SDK_ERROR',
              error: error || 'INVALID_TOKEN'
            }, globalParentOrigin);
          } else if (status === 'UNAUTHENTICATED') {
            globalToken = null;
            globalUser = null;
            globalContext = incomingContext || {};
            globalIsAuthorized = false;
            globalLoading = false;
            updateSubscribers();
            window.parent.postMessage({
              type: 'OPEN_DOME_SDK_INIT',
              version: '1.0.0',
              status: 'UNAUTHENTICATED',
              context: incomingContext || {}
            }, globalParentOrigin);
          } else {
            globalToken = payload;
            globalUser = incomingUser || null;
            globalContext = incomingContext || {};
            globalIsAuthorized = true;
            globalLoading = false;
            updateSubscribers();
            window.parent.postMessage({
              type: 'OPEN_DOME_SDK_INIT',
              version: '1.0.0',
              status: 'AUTHORIZED',
              context: incomingContext || {}
            }, globalParentOrigin);
          }
        }

        if (type === 'OPENDOME_REGISTER_RESPONSE' || type === 'OPENDOME_LOGIN_RESPONSE') {
          if (status === 'SUCCESS') {
            globalToken = payload.token;
            globalUser = incomingUser || null;
            // Merge incoming context (auth-specific: wsJwt) on top of the
            // existing environment context (theme, lang, etc.) — never replace,
            // so Sandbox-injected display variables survive the session upgrade.
            globalContext = { ...(globalContext || {}), ...(incomingContext || {}) };
            globalIsAuthorized = true;
            globalLoading = false;
            updateSubscribers();
            window.parent.postMessage({
              type: 'OPEN_DOME_SDK_INIT',
              version: '1.0.0',
              status: 'AUTHORIZED',
              context: globalContext
            }, globalParentOrigin);
          } else {
            console.error(`[Open-Dome SDK] Auth response failed (${type}):`, error);
            globalIsAuthorized = false;
            globalLoading = false;
            updateSubscribers();
          }
        }

        if (type === 'OPENDOME_LOCATION_UPDATE') {
          globalProxiedLocation = payload;
          updateSubscribers();
        }
      };

      window.addEventListener('message', handleMessage);

      // Post validation details back
      window.parent.postMessage({
        type: 'OPENDOME_READY',
        token: appToken || null,
        appId: appId || null
      }, getTargetOrigin());

      const timeout = setTimeout(() => {
        if (!globalIsAuthorized && process.env.EXPO_PUBLIC_OD_SKIP_AUTH === 'true') {
          globalToken = 'DEBUG_TOKEN';
          globalUser = {
            username: 'DebugUser',
            evmAddress: '0xb90513424b01eA257bF8f87223A6eD8fe0Ce0681',
            solanaAddress: 'FUL1iK9p2jotYhjPAodbzbNQ5fmHWEyDa6RrBuy6tt8u'
          };
          globalContext = { theme: 'light', lang: 'en' };
          globalIsAuthorized = true;
          globalLoading = false;
          updateSubscribers();
        }
      }, 2000);

      return () => {
        window.removeEventListener('message', handleMessage);
        clearTimeout(timeout);
        subscribers.delete(setState);
      };
    }

    return () => {
      subscribers.delete(setState);
    };
  }, [config.appToken, config.token, config.appId]);

  const parseJwt = (t) => {
    if (!t) return null;
    try {
      const base64Url = t.split('.')[1];
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const getDecodedUsername = () => {
    if (state.token) {
      const decoded = parseJwt(state.token);
      return decoded?.username || null;
    }
    return null;
  };

  const enrichedUser = (state.token || state.user) ? {
    username: getDecodedUsername() || state.user?.username || null,
    evmAddress: state.user?.evmAddress || null,
    solanaAddress: state.user?.solanaAddress || null
  } : null;

  return {
    isAuthorized: state.isAuthorized,
    token: state.token,
    user: enrichedUser,
    context: state.context,
    loading: state.loading,
    proxiedLocation: state.proxiedLocation,
    blockchain,
    register,
    login,
    logout,
    Wallet,
    Transfer,
    TransferToken,
    Location,
    Events,
    Communication
  };
}
