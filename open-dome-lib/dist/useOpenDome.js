"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useOpenDome = useOpenDome;
var _react = require("react");
var _blockchain = require("./blockchain");
var _location = require("./location");
var _events = require("./events");
var _communication = require("./communication");
var _agent = require("./agent");
var _host = require("./host");
var _docking = require("./docking");
const ALLOWED_ORIGINS = ['https://sandbox.opendome.xyz', 'https://app.opendome.xyz', 'http://localhost:8082', 'http://localhost:8083'];
const isLocalhostOrigin = urlStr => {
  try {
    const url = new URL(urlStr);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch (e) {
    return urlStr.includes('localhost') || urlStr.includes('127.0.0.1');
  }
};
const checkOrigin = origin => {
  let normalized;
  try {
    normalized = new URL(origin).origin;
  } catch {
    return false;
  }
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
let globalMessageHandler = null;
let globalParentOrigin = null;
let globalAuthError = null;
let globalAuthPending = false;
/** True when opened outside OpenDome host (no iframe) or dock rejected. */
let globalIsLocked = false;
/** Shared Blockchain across all useOpenDome() mounts (App config wins). */
let globalBlockchain = undefined;
const subscribers = new Set();
function resolveBlockchain(config = {}) {
  // Explicit opt-out for Admin / non-wallet mounts — do not touch the shared instance.
  if (config.blockchain === false) return null;
  if (config.blockchain && typeof config.blockchain === 'object') {
    globalBlockchain = new _blockchain.Blockchain(config.blockchain);
    return globalBlockchain;
  }
  if (globalBlockchain === undefined) {
    globalBlockchain = new _blockchain.Blockchain();
  }
  return globalBlockchain;
}
const updateSubscribers = () => {
  subscribers.forEach(fn => {
    try {
      fn({
        token: globalToken,
        user: globalUser,
        context: globalContext,
        isAuthorized: globalIsAuthorized,
        loading: globalLoading,
        proxiedLocation: globalProxiedLocation,
        authError: globalAuthError,
        authPending: globalAuthPending,
        isLocked: globalIsLocked
      });
    } catch (e) {
      // safe ignore
    }
  });
};
function allowStandaloneDebug(config) {
  return config.allowStandalone === true || process.env.EXPO_PUBLIC_OD_ALLOW_STANDALONE === 'true';
}
function skipAuthEnabled() {
  return process.env.EXPO_PUBLIC_OD_SKIP_AUTH === 'true';
}

/**
 * useOpenDome SDK Hook
 * Handles the secure handshake, token verification, and context synchronization.
 * Uses a shared state pattern to prevent duplicate handshakes on multiple component mounts.
 */
function useOpenDome(config = {}) {
  // Automatically sync appId with the Communication singleton
  const appId = config.appId || (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_OD_APP_ID : null);
  if (appId) {
    _communication.Communication.appId = appId;
  }
  const [state, setState] = (0, _react.useState)({
    token: globalToken,
    user: globalUser,
    context: globalContext,
    isAuthorized: globalIsAuthorized,
    loading: globalLoading,
    proxiedLocation: globalProxiedLocation,
    authError: globalAuthError,
    authPending: globalAuthPending,
    isLocked: globalIsLocked
  });

  // Shared blockchain singleton — App.js config is used by WalletView / PassesView
  // even when those children call useOpenDome() with no args.
  const [blockchain] = (0, _react.useState)(() => resolveBlockchain(config));
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
        return 'http://localhost:8082';
      }
      return 'https://app.opendome.xyz';
    } catch (e) {
      return 'https://app.opendome.xyz';
    }
  };
  const getParentOrigin = () => {
    return globalParentOrigin || getTargetOrigin();
  };
  const register = username => {
    globalAuthError = null;
    globalAuthPending = true;
    updateSubscribers();
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'OPENDOME_REGISTER_REQUEST',
        payload: {
          username
        }
      }, getParentOrigin());
    } else {
      console.warn('[Open-Dome SDK] Not running in parent window context.');
    }
  };
  const login = () => {
    globalAuthError = null;
    globalAuthPending = true;
    updateSubscribers();
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
      const {
        wsJwt,
        ...envContext
      } = globalContext;
      globalContext = envContext;
    }
    globalIsAuthorized = false;
    globalLoading = false;
    globalAuthError = null;
    globalAuthPending = false;
    updateSubscribers();
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'OPENDOME_LOGOUT'
      }, getParentOrigin());
    }
  };
  (0, _react.useEffect)(() => {
    subscribers.add(setState);

    // Standalone URL (not in OpenDome iframe) → locked unless explicit debug escape
    if (typeof window !== 'undefined' && window.parent === window) {
      if (allowStandaloneDebug(config) && skipAuthEnabled() && !globalToken) {
        globalToken = 'DEBUG_TOKEN';
        globalUser = {
          username: 'DebugUser',
          evmAddress: '0xb90513424b01eA257bF8f87223A6eD8fe0Ce0681',
          solanaAddress: 'FUL1iK9p2jotYhjPAodbzbNQ5fmHWEyDa6RrBuy6tt8u'
        };
        globalContext = {
          theme: 'light',
          lang: 'en'
        };
        globalIsAuthorized = true;
        globalIsLocked = false;
        globalLoading = false;
      } else {
        globalIsLocked = true;
        globalIsAuthorized = false;
        globalLoading = false;
      }
      updateSubscribers();
    }

    // Iframe: keep one message listener for the lifetime of the page.
    // React Strict Mode unmounts the first effect; removing the listener there
    // dropped LOGIN_RESPONSE and left Sign in spinning forever.
    if (typeof window !== 'undefined' && window.parent !== window) {
      globalIsLocked = false;
      const handleMessage = globalMessageHandler || (event => {
        if (!event.data) return;
        if (event.source !== window.parent) return;
        const normalizedOrigin = event.origin.replace(/\/$/, '');
        if (!checkOrigin(normalizedOrigin)) return;

        // Dynamically capture parent origin
        globalParentOrigin = event.origin;
        const {
          type,
          payload,
          user: incomingUser,
          context: incomingContext,
          status,
          error
        } = event.data;
        if (type === 'OPENDOME_HANDSHAKE') {
          if (status === 'UNAUTHORIZED' || error) {
            console.error('[Open-Dome SDK] Handshake unauthorized:', error);
            globalIsAuthorized = false;
            globalIsLocked = true;
            globalLoading = false;
            globalAuthPending = false;
            updateSubscribers();
            window.parent.postMessage({
              type: 'OPEN_DOME_SDK_ERROR',
              error: error || 'INVALID_TOKEN'
            }, globalParentOrigin);
          } else if (status === 'UNAUTHENTICATED') {
            // A late guest handshake must not wipe a session we just signed in.
            if (globalIsAuthorized && globalToken) {
              globalLoading = false;
              globalAuthPending = false;
              updateSubscribers();
            } else {
              globalToken = null;
              globalUser = null;
              globalContext = incomingContext || {};
              globalIsAuthorized = false;
              globalIsLocked = false;
              globalLoading = false;
              globalAuthPending = false;
              updateSubscribers();
              window.parent.postMessage({
                type: 'OPEN_DOME_SDK_INIT',
                version: '1.0.0',
                status: 'UNAUTHENTICATED',
                context: incomingContext || {}
              }, globalParentOrigin);
            }
          } else {
            globalToken = payload;
            globalUser = incomingUser || null;
            globalContext = incomingContext || {};
            globalIsAuthorized = true;
            globalIsLocked = false;
            globalLoading = false;
            globalAuthError = null;
            globalAuthPending = false;
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
          const nextToken = payload?.token || (typeof payload === 'string' ? payload : null);
          if (status === 'SUCCESS' && nextToken) {
            globalToken = nextToken;
            globalUser = incomingUser || null;
            // Merge incoming context (auth-specific: wsJwt) on top of the
            // existing environment context (theme, lang, etc.) — never replace,
            // so Sandbox-injected display variables survive the session upgrade.
            globalContext = {
              ...(globalContext || {}),
              ...(incomingContext || {})
            };
            globalIsAuthorized = true;
            globalIsLocked = false;
            globalLoading = false;
            globalAuthError = null;
            globalAuthPending = false;
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

            // Try parsing JSON error from Sandbox
            let parsedError = error || 'Authentication failed';
            try {
              const errObj = JSON.parse(error);
              if (errObj && errObj.error) parsedError = errObj.error;
            } catch (e) {}
            globalAuthError = parsedError;
            globalAuthPending = false;
            updateSubscribers();
          }
        }
        if (type === 'OPENDOME_LOCATION_UPDATE') {
          globalProxiedLocation = payload;
          updateSubscribers();
        }
      });
      if (!globalMessageHandler) {
        globalMessageHandler = handleMessage;
        window.addEventListener('message', globalMessageHandler);
      }
      if (!globalHandshakeInitiated) {
        globalHandshakeInitiated = true;
        (0, _docking.resolveAppCredentials)(config).catch(() => ({
          appToken: null,
          appId: null
        })).then(({
          appToken,
          appId
        }) => {
          window.parent.postMessage({
            type: 'OPENDOME_READY',
            token: appToken || null,
            appId: appId || null
          }, getTargetOrigin());
          setTimeout(() => {
            if (globalLoading && !globalIsAuthorized) {
              if (allowStandaloneDebug(config) && skipAuthEnabled()) {
                globalToken = 'DEBUG_TOKEN';
                globalUser = {
                  username: 'DebugUser',
                  evmAddress: '0xb90513424b01eA257bF8f87223A6eD8fe0Ce0681',
                  solanaAddress: 'FUL1iK9p2jotYhjPAodbzbNQ5fmHWEyDa6RrBuy6tt8u'
                };
                globalContext = {
                  theme: 'light',
                  lang: 'en'
                };
                globalIsAuthorized = true;
                globalIsLocked = false;
                globalLoading = false;
              } else {
                globalIsLocked = true;
                globalIsAuthorized = false;
                globalLoading = false;
              }
              updateSubscribers();
            }
          }, 5000);
        });
      }
      return () => {
        subscribers.delete(setState);
      };
    }
    return () => {
      subscribers.delete(setState);
    };
  }, [config.appToken, config.token, config.appId]);
  const parseJwt = t => {
    if (!t) return null;
    try {
      const base64Url = t.split('.')[1];
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
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
  const decodedJwt = state.token ? parseJwt(state.token) : null;
  const enrichedUser = state.token || state.user ? {
    username: getDecodedUsername() || state.user?.username || null,
    role: decodedJwt?.role || state.user?.role || null,
    evmAddress: state.user?.evmAddress || decodedJwt?.evm || null,
    solanaAddress: state.user?.solanaAddress || decodedJwt?.solana || null
  } : null;
  return {
    isAuthorized: state.isAuthorized,
    isLocked: state.isLocked,
    token: state.token,
    user: enrichedUser,
    context: state.context,
    loading: state.loading,
    authError: state.authError,
    authPending: state.authPending,
    proxiedLocation: state.proxiedLocation,
    blockchain,
    register,
    login,
    logout,
    Wallet: _blockchain.Wallet,
    Transfer: _blockchain.Transfer,
    TransferToken: _blockchain.TransferToken,
    Location: _location.Location,
    Events: _events.Events,
    Communication: _communication.Communication,
    Agent: _agent.Agent,
    Host: _host.Host
  };
}