import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, Image, ActivityIndicator, Animated } from 'react-native';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import SmartProvider from '../components/SmartProvider';
import EventBoard from '../components/EventBoard';
import LogoO from '../assets/logoP.png';

const verifyTokenOnServer = async (token) => {
  console.log(`[Open-Dome Sandbox Frontend] Calling Server API to verify token...`);
  try {
    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.valid) {
      return { 
        token: data.token, 
        wsJwt: data.wsJwt, 
        hostJwt: data.hostJwt,
        username: data.username,
        evmAddress: data.evmAddress,
        solanaAddress: data.solanaAddress,
        authenticated: data.authenticated
      };
    }
    return null;
  } catch (err) {
    console.error('[Open-Dome Sandbox Frontend] API Server communication failed:', err.message);
    return null;
  }
};

function CollapsibleSection({ title, isExpanded, onToggle, children }) {
  const [animation] = useState(new Animated.Value(isExpanded ? 1 : 0));
  const [shouldRender, setShouldRender] = useState(isExpanded);

  useEffect(() => {
    Animated.timing(animation, {
      toValue: isExpanded ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
    if (isExpanded) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  const animatedStyle = {
    opacity: animation,
    maxHeight: animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1200],
    }),
    overflow: 'hidden',
  };

  return (
    <View style={styles.collapsibleContainer}>
      <TouchableOpacity
        style={styles.collapsibleSectionHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.collapsibleSectionTitle}>{title}</Text>
        <Text style={styles.collapsibleChevron}>{isExpanded ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {shouldRender && (
        <Animated.View style={animatedStyle}>
          <View style={styles.collapsibleContent}>
            {children}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const renderLogLine = (logLine, index) => {
  let color = '#E1E1E6';
  let prefix = '';
  
  if (logLine.includes('[SECURITY]')) {
    color = '#FF453A';
    prefix = '🛡️ ';
  } else if (logLine.includes('FAIL') || logLine.includes('ERROR') || logLine.includes('Rejected')) {
    color = '#FF453A';
    prefix = '⚠️ ';
  } else if (logLine.includes('SUCCESS') || logLine.includes('verified successfully') || logLine.includes('Success')) {
    color = '#30D158';
    prefix = '✅ ';
  } else if (logLine.includes('[HANDSHAKE]')) {
    color = '#64D2FF';
    prefix = '🤝 ';
  } else if (logLine.includes('[REGISTRATION]')) {
    color = '#FF9F0A';
    prefix = '📝 ';
  } else if (logLine.includes('[AUTHENTICATION]')) {
    color = '#BF5AF2';
    prefix = '🔑 ';
  } else if (logLine.includes('[LOGOUT]')) {
    color = '#FF3B30';
    prefix = '🚪 ';
  } else if (logLine.includes('[SESSION]')) {
    color = '#FFD60A';
    prefix = '💡 ';
  }

  const match = logLine.match(/^\[([^\]]+)\]\s*(.*)/);
  if (match) {
    const timestamp = match[1];
    const rest = match[2];
    return (
      <Text key={index} style={[styles.logText, { color }]}>
        <Text style={styles.logTimestamp}>[{timestamp}]</Text> {prefix}{rest}
      </Text>
    );
  }

  return (
    <Text key={index} style={[styles.logText, { color }]}>
      {prefix}{logLine}
    </Text>
  );
};

export default function App() {
  const [url, setUrl] = useState(() => {
    try {
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:8082/';
      }
    } catch (e) {}
    return 'https://miniapp.expo.app';
  });
  const [verifiedToken, setVerifiedToken] = useState(() => {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem('opendome_sandbox_verified_token') : null;
    } catch (e) {
      return null;
    }
  });
  const [dynamicContext, setDynamicContext] = useState([
    { key: 'theme', value: 'dark' },
    { key: 'lang', value: 'en' }
  ]);
  const [sdkStatus, setSdkStatus] = useState({
    detected: false,
    version: null,
    status: 'PENDING',
    error: null,
    context: {}
  });
  const [isAuthExpanded, setIsAuthExpanded] = useState(true);
  const [isConfigExpanded, setIsConfigExpanded] = useState(true);
  const [isContextExpanded, setIsContextExpanded] = useState(true);
  const [isLogsExpanded, setIsLogsExpanded] = useState(true);
  const [eventsConfig, setEventsConfig] = useState({ jwt: '' });
  const [activeUrl, setActiveUrl] = useState(null);
  const [isInjecting, setIsInjecting] = useState(false);

  // Delegated intent states — Sandbox has NO local auth UI
  const [registerUsername, setRegisterUsername] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [pendingIntent, setPendingIntent] = useState(null);
  const [logs, setLogs] = useState([]);

  // Stable refs so the message listener never needs to re-mount
  const verifiedTokenRef = useRef(verifiedToken);
  const dynamicContextRef = useRef(dynamicContext);
  const pendingIntentRef = useRef(pendingIntent);
  const urlRef = useRef(url);
  const activeUrlRef = useRef(activeUrl);
  // Handler refs — updated every render so the stable listener always
  // calls the latest version (fixes stale closure on activeUrl / getMiniAppOrigin)
  const handleDelegatedRegisterRef = useRef(null);
  const handleDelegatedAuthenticateRef = useRef(null);

  const getMiniAppOrigin = () => {
    try {
      if (activeUrl) return new URL(activeUrl).origin;
      if (url) return new URL(url).origin;
    } catch (e) {
      // ignore
    }
    return 'https://miniapp.expo.app';
  };

  const addLog = (msg) => {
    console.log(`[Sandbox] ${msg}`);
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 99)]);
  };

  // Keep refs in sync with state so stable listener always reads current values
  useEffect(() => { verifiedTokenRef.current = verifiedToken; }, [verifiedToken]);
  useEffect(() => { dynamicContextRef.current = dynamicContext; }, [dynamicContext]);
  useEffect(() => { pendingIntentRef.current = pendingIntent; }, [pendingIntent]);
  useEffect(() => { urlRef.current = url; }, [url]);
  useEffect(() => { activeUrlRef.current = activeUrl; }, [activeUrl]);
  // Sync handler refs every render so stable listener always calls latest version
  useEffect(() => { handleDelegatedRegisterRef.current = handleDelegatedRegister; });
  useEffect(() => { handleDelegatedAuthenticateRef.current = handleDelegatedAuthenticate; });

  const addContextRow = () => {
    setDynamicContext([...dynamicContext, { key: '', value: '' }]);
  };

  const clearSession = () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('opendome_sandbox_verified_token');
      }
    } catch (e) {}
    setVerifiedToken(null);
    setUserProfile(null);
    setActiveUrl(null);
    setSdkStatus({ detected: false, version: null, status: 'PENDING', error: null, context: {} });
    addLog('[SESSION] Session cleared. Token and profile wiped. Re-login required.');
  };

  const updateContextRow = (index, field, val) => {
    const newContext = [...dynamicContext];
    newContext[index][field] = val;
    setDynamicContext(newContext);
  };

  const removeContextRow = (index) => {
    setDynamicContext(dynamicContext.filter((_, i) => i !== index));
  };

  // Delegated Passkey Ceremonies (triggered from Mini App iframe)
  const handleDelegatedRegister = async (username) => {
    addLog(`[REGISTRATION] Start requested for username: "${username}"`);
    try {
      addLog('[REGISTRATION] Sending POST to /api/passkey/register-options...');
      const optRes = await fetch('/api/passkey/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      if (!optRes.ok) {
        const errText = await optRes.text();
        addLog(`[REGISTRATION] FAIL: Options fetch returned status ${optRes.status}: ${errText}`);
        throw new Error(errText);
      }
      const { options, userId: generatedUserId } = await optRes.json();
      addLog(`[REGISTRATION] Success. Options received: UserID=${generatedUserId}, Challenge=${options.challenge.slice(0, 10)}...`);
      
      addLog('[REGISTRATION] Prompting user browser WebAuthn authenticator...');
      const credential = await startRegistration({ optionsJSON: options });
      addLog(`[REGISTRATION] Success. WebAuthn Credential ID: ${credential.id}`);
      
      addLog('[REGISTRATION] Sending credential verification payload to /api/passkey/register-verify...');
      const verifyRes = await fetch('/api/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: generatedUserId, credentialResponse: credential })
      });
      if (!verifyRes.ok) {
        const errText = await verifyRes.text();
        addLog(`[REGISTRATION] FAIL: Verification fetch returned status ${verifyRes.status}: ${errText}`);
        throw new Error(errText);
      }
      const verifyResult = await verifyRes.json();
      addLog(`[REGISTRATION] Success. verified=${verifyResult.verified}, token=${verifyResult.token ? verifyResult.token.slice(0, 10) + '...' : 'none'}`);

      if (verifyResult.verified && verifyResult.token) {
        addLog('[REGISTRATION] Requesting profile context verify on Sandbox server...');
        const profile = await verifyTokenOnServer(verifyResult.token);
        const iframe = document.querySelector('iframe');
        if (iframe && iframe.contentWindow && profile) {
          addLog('[REGISTRATION] Dispatching OPENDOME_REGISTER_RESPONSE (SUCCESS) back to Mini App iframe.');
          iframe.contentWindow.postMessage({
            type: 'OPENDOME_REGISTER_RESPONSE',
            status: 'SUCCESS',
            payload: {
              token: verifyResult.token
            },
            user: {
              username: profile.username,
              evmAddress: profile.evmAddress,
              solanaAddress: profile.solanaAddress
            },
            context: {
              wsJwt: profile.wsJwt
            }
          }, getMiniAppOrigin());
        }
        await fetchProfile(verifyResult.token);
      } else {
        throw new Error('Registration verification failed internally on server');
      }
    } catch (err) {
      addLog(`[REGISTRATION] ERROR: ${err.message}`);
      const iframe = document.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'OPENDOME_REGISTER_RESPONSE',
          status: 'ERROR',
          error: err.message
        }, getMiniAppOrigin());
      }
    }
  };

  const handleDelegatedAuthenticate = async () => {
    addLog('[AUTHENTICATION] Start requested from Mini App...');
    try {
      addLog('[AUTHENTICATION] Sending POST to /api/passkey/login-options...');
      const optRes = await fetch('/api/passkey/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!optRes.ok) {
        const errText = await optRes.text();
        addLog(`[AUTHENTICATION] FAIL: Options fetch returned status ${optRes.status}: ${errText}`);
        throw new Error(errText);
      }
      const { options, challengeId } = await optRes.json();
      addLog(`[AUTHENTICATION] Success. Options received: ChallengeId=${challengeId}, Challenge=${options.challenge.slice(0, 10)}...`);

      addLog('[AUTHENTICATION] Prompting user browser WebAuthn authenticator...');
      const assertion = await startAuthentication({ optionsJSON: options });
      addLog(`[AUTHENTICATION] Success. WebAuthn Assertion ID: ${assertion.id}`);

      addLog('[AUTHENTICATION] Sending assertion verification payload to /api/passkey/login-verify...');
      const verifyRes = await fetch('/api/passkey/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, assertionResponse: assertion })
      });
      if (!verifyRes.ok) {
        const errText = await verifyRes.text();
        addLog(`[AUTHENTICATION] FAIL: Verification fetch returned status ${verifyRes.status}: ${errText}`);
        throw new Error(errText);
      }
      const verifyResult = await verifyRes.json();
      addLog(`[AUTHENTICATION] Success. verified=${verifyResult.verified}, token=${verifyResult.token ? verifyResult.token.slice(0, 10) + '...' : 'none'}`);

      if (verifyResult.verified && verifyResult.token) {
        addLog('[AUTHENTICATION] Requesting profile context verify on Sandbox server...');
        const profile = await verifyTokenOnServer(verifyResult.token);
        const iframe = document.querySelector('iframe');
        if (iframe && iframe.contentWindow && profile) {
          addLog('[AUTHENTICATION] Dispatching OPENDOME_LOGIN_RESPONSE (SUCCESS) back to Mini App iframe.');
          iframe.contentWindow.postMessage({
            type: 'OPENDOME_LOGIN_RESPONSE',
            status: 'SUCCESS',
            payload: {
              token: verifyResult.token
            },
            user: {
              username: profile.username,
              evmAddress: profile.evmAddress,
              solanaAddress: profile.solanaAddress
            },
            context: {
              wsJwt: profile.wsJwt
            }
          }, getMiniAppOrigin());
        }
        await fetchProfile(verifyResult.token);
      } else {
        throw new Error('Authentication verification failed internally on server');
      }
    } catch (err) {
      addLog(`[AUTHENTICATION] ERROR: ${err.message}`);
      const iframe = document.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'OPENDOME_LOGIN_RESPONSE',
          status: 'ERROR',
          error: err.message
        }, getMiniAppOrigin());
      }
    }
  };

  const fetchProfile = async (tokenVal) => {
    try {
      const res = await verifyTokenOnServer(tokenVal);
      if (res && res.authenticated) {
        setVerifiedToken(tokenVal);
        try {
          if (typeof window !== 'undefined' && tokenVal) {
            window.localStorage.setItem('opendome_sandbox_verified_token', tokenVal);
          }
        } catch (e) {}
        setUserProfile({
          username: res.username || 'SandboxUser',
          evmAddress: res.evmAddress,
          solanaAddress: res.solanaAddress
        });
        setEventsConfig({ jwt: res.hostJwt || '' });
        
        addLog(`Profile loaded: @${res.username}`);
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
  };

  useEffect(() => {
    // Always fetch a generic host token on mount to keep the Communication API connected permanently
    const initHostToken = async () => {
      try {
        const res = await verifyTokenOnServer(null);
        if (res && res.hostJwt) {
          setEventsConfig({ jwt: res.hostJwt });
          addLog('[SYSTEM] Permanent Sandbox host token initialized for Communication API.');
        }
      } catch (err) {
        console.error('Failed to init host token:', err);
      }
    };
    initHostToken();

    if (verifiedToken) {
      addLog('[SESSION] Stored session token detected. Restoring profile...');
      fetchProfile(verifiedToken);
    }
  }, []);


  // Intent Operations
  const handleApproveIntent = async () => {
    if (!pendingIntent) return;
    addLog('Prompting biometric passkey to authorize transaction...');
    try {
      // Prompt passkey to prove biometric consent
      const optRes = await fetch('/api/passkey/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!optRes.ok) throw new Error(await optRes.text());
      const { options, challengeId } = await optRes.json();

      const assertion = await startAuthentication({ optionsJSON: options });
      addLog('Verifying user authorization signature...');

      const verifyRes = await fetch('/api/passkey/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, assertionResponse: assertion })
      });
      if (!verifyRes.ok) throw new Error(await verifyRes.text());
      const verifyResult = await verifyRes.json();

      if (verifyResult.verified) {
        addLog('Passkey verified successfully. Sign authorization complete.');
        const iframe = document.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
          // Generate a mock hash for the approval
          const txHash = `0x_sig_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
          iframe.contentWindow.postMessage({
            type: 'OPENDOME_INTENT_RESPONSE',
            status: 'SUCCESS',
            payload: {
              hash: txHash,
              chain: pendingIntent.chain,
              to: pendingIntent.to,
              amount: pendingIntent.amount
            }
          }, getMiniAppOrigin());
          addLog(`Sent SUCCESS response to Mini App: ${txHash.substring(0, 15)}...`);
        }
        setPendingIntent(null);
      } else {
        throw new Error('Biometric signature rejected');
      }
    } catch (err) {
      addLog(`Intent authorization failed: ${err.message}`);
    }
  };

  const handleRejectIntent = () => {
    if (!pendingIntent) return;
    addLog('Transaction intent rejected by user.');
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'OPENDOME_INTENT_RESPONSE',
        status: 'REJECTED',
        error: 'USER_REJECTED'
      }, getMiniAppOrigin());
    }
    setPendingIntent(null);
  };

  // Listen for SDK signals and Intents — STABLE listener, never re-mounted
  useEffect(() => {
    const getOrigin = () => {
      try {
        // Prefer the active injected URL — that's the real iframe origin
        const u = activeUrlRef.current || urlRef.current;
        if (u) return new URL(u).origin;
      } catch (e) {}
      return null;
    };

    const handleMessage = (event) => {
      if (!event.data) return;

      // ── Security Gate ──────────────────────────────────────────────────────
      // Step 1: Source check (primary). The iframe contentWindow reference is
      // unforgeable — only OUR loaded iframe can pass this.
      const iframe = document.querySelector('iframe');
      if (!iframe || event.source !== iframe.contentWindow) return;

      // Step 2: Origin consistency check (secondary).
      // The message origin must match the origin of the URL in the Sandbox URL
      // bar (the URL that was loaded into the iframe). This prevents a scenario
      // where a different page hijacks the iframe reference.
      // Both localhost/127.0.0.1 origins are always treated as consistent with
      // each other for local development (port differences are irrelevant).
      const configuredOrigin = getOrigin();
      if (configuredOrigin) {
        const isConfiguredLocalhost = configuredOrigin.includes('localhost') || configuredOrigin.includes('127.0.0.1');
        const isEventLocalhost = event.origin.includes('localhost') || event.origin.includes('127.0.0.1');
        // If both ends are localhost — consistent. If not, origins must match exactly.
        if (!(isConfiguredLocalhost && isEventLocalhost) && event.origin !== configuredOrigin) {
          addLog(`[SECURITY] Origin mismatch: message from "${event.origin}" but iframe URL is "${configuredOrigin}". Rejected.`);
          return;
        }
      }
      // ───────────────────────────────────────────────────────────────────────

      if (event.data && event.data.type === 'OPEN_DOME_SDK_INIT') {
        setSdkStatus({
          detected: true,
          version: event.data.version,
          status: event.data.status,
          error: null,
          context: event.data.context || {}
        });
      }

      if (event.data && event.data.type === 'OPEN_DOME_SDK_ERROR') {
        setSdkStatus(prev => ({
          ...prev,
          detected: true,
          status: 'UNAUTHORIZED',
          error: event.data.error
        }));
      }

      if (event.data && event.data.type === 'OPENDOME_READY') {
        const { token: appDebugToken, appId } = event.data;
        addLog(`[HANDSHAKE] OPENDOME_READY received. AppId="${appId || 'unknown'}", AppToken="${appDebugToken ? appDebugToken.slice(0, 10) + '...' : 'none'}"`);
        
        setEventsConfig(prev => ({ ...prev, appId: appId }));

        const iframeEl = document.querySelector('iframe');
        if (iframeEl && iframeEl.contentWindow) {
          // Build context from the ref (always current, no stale closure)
          const contextObj = {};
          dynamicContextRef.current.forEach(row => {
            if (row.key) contextObj[row.key] = row.value;
          });

          const currentOrigin = getOrigin() || 'https://miniapp.expo.app';

          addLog('[HANDSHAKE] Validating App Token on server to retrieve communication wsJwt...');
          verifyTokenOnServer(appDebugToken).then(async (appRes) => {
            if (appRes && appRes.wsJwt) {
              const wsJwt = appRes.wsJwt;
              addLog(`[HANDSHAKE] App verified successfully. wsJwt generated.`);

              // Read verifiedToken from ref — always current regardless of when OPENDOME_READY fires
              const currentToken = verifiedTokenRef.current;
              if (currentToken) {
                addLog(`[HANDSHAKE] Active Sandbox User session found: ${currentToken.slice(0, 10)}... Calling server verify for User...`);
                try {
                  const userRes = await verifyTokenOnServer(currentToken);
                  if (userRes && userRes.authenticated) {
                    addLog(`[HANDSHAKE] SUCCESS: User @${userRes.username} verified. Sending VERIFIED handshake with User credentials.`);
                    iframeEl.contentWindow.postMessage({
                      type: 'OPENDOME_HANDSHAKE',
                      status: 'VERIFIED',
                      payload: userRes.token,
                      user: {
                        username: userRes.username,
                        evmAddress: userRes.evmAddress,
                        solanaAddress: userRes.solanaAddress
                      },
                      context: {
                        ...contextObj,
                        wsJwt
                      }
                    }, currentOrigin);

                    setUserProfile({
                      username: userRes.username,
                      evmAddress: userRes.evmAddress,
                      solanaAddress: userRes.solanaAddress
                    });
                    return;
                  }
                } catch (e) {
                  addLog(`[HANDSHAKE] User verify error: ${e.message}. Pushing guest session.`);
                }
              }

              // Default: Unauthenticated but with valid communication wsJwt
              addLog('[HANDSHAKE] Guest Mode: Sending UNAUTHENTICATED handshake with valid communication wsJwt.');
              iframeEl.contentWindow.postMessage({
                type: 'OPENDOME_HANDSHAKE',
                status: 'UNAUTHENTICATED',
                payload: null,
                user: null,
                context: {
                  ...contextObj,
                  wsJwt
                }
              }, currentOrigin);
            } else {
              addLog('[HANDSHAKE] FAIL: App Token verification failed or returned invalid. Sending UNAUTHORIZED handshake.');
              iframeEl.contentWindow.postMessage({
                type: 'OPENDOME_HANDSHAKE',
                status: 'UNAUTHORIZED',
                error: 'INVALID_TOKEN'
              }, currentOrigin);
            }
          });
        }
      }

      // Handle Intent Request from Mini App
      if (event.data && event.data.type === 'OPENDOME_INTENT_REQUEST') {
        const { chain, to, amount } = event.data.payload;
        addLog(`[INTENT] Incoming request: Send ${amount} ${chain.toUpperCase()} to ${to.slice(0, 10)}...`);
        setPendingIntent({ chain, to, amount });
      }

      // Handle Delegated Register from Mini App
      if (event.data && event.data.type === 'OPENDOME_REGISTER_REQUEST') {
        const { username } = event.data.payload;
        addLog(`[REGISTRATION] Received OPENDOME_REGISTER_REQUEST from Mini App for username "${username}"`);
        // Call via ref to always use the latest closure (avoids stale activeUrl bug)
        if (handleDelegatedRegisterRef.current) handleDelegatedRegisterRef.current(username);
      }

      // Handle Delegated Login from Mini App
      if (event.data && event.data.type === 'OPENDOME_LOGIN_REQUEST') {
        addLog('[AUTHENTICATION] Received OPENDOME_LOGIN_REQUEST from Mini App');
        // Call via ref to always use the latest closure (avoids stale activeUrl bug)
        if (handleDelegatedAuthenticateRef.current) handleDelegatedAuthenticateRef.current();
      }

      // Handle Logout from Mini App
      if (event.data && event.data.type === 'OPENDOME_LOGOUT') {
        addLog('[LOGOUT] Received OPENDOME_LOGOUT from Mini App. Clearing token, profile, and resetting session.');
        setVerifiedToken(null);
        verifiedTokenRef.current = null;
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('opendome_sandbox_verified_token');
          }
        } catch (e) {}
        setUserProfile(null);
      }

      // Handle AI Agent Prompt from Mini App
      if (event.data && event.data.type === 'OPENDOME_AI_PROMPT') {
        const { id, payload: aiPayload } = event.data;
        const promptText = aiPayload?.prompt || '';
        addLog(`[AGENT] Received prompt: "${promptText.substring(0, 30)}..."`);
        
        fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptText })
        })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Server error');
          return data;
        })
        .then(data => {
          event.source.postMessage({
            type: 'OPENDOME_AI_RESPONSE',
            id,
            response: data.response
          }, event.origin);
          addLog(`[AGENT] Success. Response sent to Mini App.`);
        })
        .catch(err => {
          addLog(`[AGENT] Error: ${err.message}`);
          event.source.postMessage({
            type: 'OPENDOME_AI_RESPONSE',
            id,
            error: err.message
          }, event.origin);
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []); // Stable — reads live values via refs, no re-registration needed

  // Location Proxy
  useEffect(() => {
    if (!activeUrl) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const iframe = document.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'OPENDOME_LOCATION_UPDATE',
            payload: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: pos.timestamp
            }
          }, getMiniAppOrigin());
        }
      },
      (err) => console.warn('[Open-Dome Parent] Location Proxy Error:', err.message),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeUrl]);

  const runTest = async () => {
    setIsInjecting(true);
    setSdkStatus({ detected: false, version: null, status: 'PENDING', error: null, context: {} });

    // Clean session and force iframe unmount
    setActiveUrl(null);
    setEventsConfig(prev => ({ jwt: prev.jwt })); // Drops appId
    await new Promise(resolve => setTimeout(resolve, 50));

    const parentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

    // Allow bypassing token verify if none exists (Mini App will render its auth screen)
    if (!verifiedToken) {
      let extraQuery = '';
      dynamicContext.forEach(row => {
        if (row.key && row.value) {
          extraQuery += `&${row.key.trim()}=${row.value.trim()}`;
        }
      });
      const separator = url.includes('?') ? '&' : '?';
      setActiveUrl(`${url}${separator}theme=dark&parentOrigin=${encodeURIComponent(parentOrigin)}${extraQuery}`);
      setIsInjecting(false);
      return;
    }

    const res = await verifyTokenOnServer(verifiedToken);
    if (!res || !res.authenticated) {
      setSdkStatus(prev => ({
        ...prev,
        detected: true,
        status: 'UNAUTHORIZED',
        error: 'INVALID_TOKEN'
      }));
      setVerifiedToken(null);
      setUserProfile(null);
      setIsInjecting(false);
      return;
    }

    const { token, wsJwt, hostJwt } = res;
    setVerifiedToken(token);
    setUserProfile({
      username: res.username || 'SandboxUser',
      evmAddress: res.evmAddress,
      solanaAddress: res.solanaAddress
    });

    let extraQuery = '';
    dynamicContext.forEach(row => {
      if (row.key && row.value) {
        extraQuery += `&${row.key.trim()}=${row.value.trim()}`;
      }
    });

    const separator = url.includes('?') ? '&' : '?';
    setActiveUrl(`${url}${separator}theme=dark&parentOrigin=${encodeURIComponent(parentOrigin)}${extraQuery}`);
    setEventsConfig({ jwt: hostJwt || '' });

    setTimeout(() => setIsInjecting(false), 500);
  };

  return (
    <View style={styles.container}>
      {/* Swiss Lab Header */}
      <View style={styles.header}>
        <View style={styles.branding}>
          <Image source={LogoO} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brandSubtitle}>OPEN_DOME_MINI_APPS_SANDBOX</Text>
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.metaText}>V1.1.0</Text>
          <Text style={styles.metaText}>SYS_READY</Text>
        </View>
      </View>

      <View style={styles.workspace}>
        {/* Control Panel - Left */}
        <View style={styles.sidebar}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Active Session Info or Login/Register Form */}
            <CollapsibleSection
              title={userProfile ? "ACTIVE SESSION" : "AUTHENTICATION"}
              isExpanded={isAuthExpanded}
              onToggle={() => setIsAuthExpanded(!isAuthExpanded)}
            >
              {!userProfile ? (
                <View style={styles.passkeyForm}>
                  <TextInput
                    style={styles.authInput}
                    placeholder="Enter username for new account"
                    placeholderTextColor="#86868B"
                    value={registerUsername}
                    onChangeText={setRegisterUsername}
                  />
                  <View style={styles.authButtonRow}>
                    <TouchableOpacity style={styles.authButtonPrimary} onPress={() => handleDelegatedRegister(registerUsername)} activeOpacity={0.6}>
                      <Text style={styles.authButtonPrimaryText}>Register Passkey</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.authButtonSecondary} onPress={() => handleDelegatedAuthenticate()} activeOpacity={0.6}>
                      <Text style={styles.authButtonSecondaryText}>Login</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.profileBox}>
                    <Text style={styles.profileName}>@{userProfile.username}</Text>
                    <Text style={styles.profileLabel}>EVM ADDRESS</Text>
                    <Text style={styles.profileKey}>{userProfile.evmAddress}</Text>
                    <Text style={styles.profileLabel}>SOLANA ADDRESS</Text>
                    <Text style={styles.profileKey}>{userProfile.solanaAddress}</Text>
                  </View>
                  <TouchableOpacity style={styles.disconnectButton} onPress={clearSession} activeOpacity={0.6}>
                    <Text style={styles.disconnectButtonText}>Disconnect Session</Text>
                  </TouchableOpacity>
                </>
              )}
            </CollapsibleSection>

            {/* 2. Pending Transaction Intents */}
            {pendingIntent && (
              <View style={styles.intentBox}>
                <Text style={styles.intentTitle}>🚨 ACTION INTENT REQUEST</Text>
                <View style={styles.intentDetails}>
                  <Text style={styles.intentField}>CHAIN: <Text style={styles.intentVal}>{pendingIntent.chain.toUpperCase()}</Text></Text>
                  <Text style={styles.intentField}>AMOUNT: <Text style={styles.intentVal}>{pendingIntent.amount}</Text></Text>
                  <Text style={styles.intentField}>TO: <Text style={styles.intentVal}>{pendingIntent.to}</Text></Text>
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.intentButtonApprove} onPress={handleApproveIntent} activeOpacity={0.6}>
                    <Text style={styles.intentButtonText}>SIGN & SEND</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.intentButtonReject} onPress={handleRejectIntent} activeOpacity={0.6}>
                    <Text style={styles.intentButtonText}>REJECT</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Configuration */}
            <CollapsibleSection
              title="CONFIGURATION"
              isExpanded={isConfigExpanded}
              onToggle={() => setIsConfigExpanded(!isConfigExpanded)}
            >
              <View style={styles.inputField}>
                <Text style={styles.inputLabel}>Endpoint URL</Text>
                <TextInput style={styles.input} value={url} onChangeText={setUrl} autoCapitalize="none" />
              </View>

              <TouchableOpacity
                style={[styles.runButton, isInjecting && { backgroundColor: '#005BB5' }]}
                onPress={runTest}
                activeOpacity={0.6}
                disabled={isInjecting}
              >
                <Text style={styles.runButtonText}>{isInjecting ? 'Injecting...' : 'Inject Payload'}</Text>
              </TouchableOpacity>
            </CollapsibleSection>

            {/* Context Variables */}
            <CollapsibleSection
              title="CONTEXT VARIABLES"
              isExpanded={isContextExpanded}
              onToggle={() => setIsContextExpanded(!isContextExpanded)}
            >
              <View style={styles.contextListContainer}>
                <View style={styles.contextHeader}>
                  <Text style={styles.contextHeaderLabel}>NAME</Text>
                  <Text style={styles.contextHeaderLabel}>VARIABLE</Text>
                  <View style={{ width: 34 }} />
                </View>
                {dynamicContext.map((row, index) => (
                  <View key={index} style={styles.contextRow}>
                    <TextInput
                      style={[styles.input, styles.contextInput]}
                      value={row.key}
                      onChangeText={(val) => updateContextRow(index, 'key', val)}
                      placeholder="key"
                      placeholderTextColor="#86868B"
                    />
                    <TextInput
                      style={[styles.input, styles.contextInput]}
                      value={row.value}
                      onChangeText={(val) => updateContextRow(index, 'value', val)}
                      placeholder="value"
                      placeholderTextColor="#86868B"
                    />
                    <TouchableOpacity style={styles.removeButton} onPress={() => removeContextRow(index)} activeOpacity={0.6}>
                      <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addButton} onPress={addContextRow} activeOpacity={0.6}>
                  <Text style={styles.addButtonText}>+ ADD VARIABLE</Text>
                </TouchableOpacity>
              </View>
            </CollapsibleSection>

            {/* Logs */}
            {logs.length > 0 && (
              <CollapsibleSection
                title="SYSTEM LOGS"
                isExpanded={isLogsExpanded}
                onToggle={() => setIsLogsExpanded(!isLogsExpanded)}
              >
                <View style={styles.logBox}>
                  <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                    {logs.map((log, idx) => renderLogLine(log, idx))}
                  </ScrollView>
                </View>
              </CollapsibleSection>
            )}
          </ScrollView>
        </View>

        {/* Stage Area - Center (Mobile Smartphone View) */}
        <View style={styles.stage}>
          <SmartProvider>
            <View style={styles.sandboxContent}>
              {activeUrl ? (
                Platform.OS === 'web' ? (
                  <>
                    <iframe
                      src={activeUrl}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        opacity: (sdkStatus.detected && (sdkStatus.status === 'AUTHORIZED' || sdkStatus.status === 'UNAUTHENTICATED' || sdkStatus.status === 'UNAUTHORIZED')) ? 1 : 0,
                        transition: 'opacity 0.25s ease-in-out'
                      }}
                      title="Compatibility Test"
                      allow="geolocation"
                    />
                    {!(sdkStatus.detected && (sdkStatus.status === 'AUTHORIZED' || sdkStatus.status === 'UNAUTHENTICATED' || sdkStatus.status === 'UNAUTHORIZED')) && (
                      <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#34C759" />
                        <Text style={styles.loadingOverlayText}>CONNECTING TO DEVICE...</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.errorText}>Web Environment Required</Text>
                )
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Ready.</Text>
                  <Text style={styles.emptyDesc}>Authenticate your Passkey ID and inject payload to start.</Text>
                </View>
              )}
            </View>
          </SmartProvider>
        </View>

        {/* Validation Panel - Right */}
        <View style={styles.rightSidebar}>
          <View style={styles.validationSection}>
            <Text style={styles.sectionLabel}>VALIDATION_CHECKLIST</Text>

            <View style={styles.checkItem}>
              <View style={[
                styles.checkDot,
                { backgroundColor: activeUrl ? '#34C759' : '#444' },
                activeUrl && styles.checkDotActive
              ]} />
              <Text style={styles.checkLabel}>Token Injected</Text>
            </View>

            <View style={styles.checkItem}>
              <View style={[
                styles.checkDot,
                { backgroundColor: sdkStatus.detected ? '#34C759' : '#444' },
                sdkStatus.detected && styles.checkDotActive
              ]} />
              <Text style={styles.checkLabel}>open-dome SDK Detected</Text>
            </View>

            <View style={styles.checkItem}>
              <View style={[
                styles.checkDot,
                {
                  backgroundColor:
                    sdkStatus.status === 'AUTHORIZED' ? '#34C759' :
                    sdkStatus.status === 'UNAUTHENTICATED' ? '#FF9F0A' :
                    sdkStatus.status === 'UNAUTHORIZED' ? '#FF3B30' : '#444'
                },
                sdkStatus.status === 'AUTHORIZED' && styles.checkDotActive,
                sdkStatus.status === 'UNAUTHORIZED' && styles.checkDotError
              ]} />
              <Text style={styles.checkLabel}>
                {sdkStatus.status === 'AUTHORIZED' ? 'Session Authorized' :
                 sdkStatus.status === 'UNAUTHENTICATED' ? 'Connected — Guest Mode' :
                 sdkStatus.status === 'UNAUTHORIZED' ? 'Handshake Rejected' :
                 'Awaiting Handshake'}
              </Text>
            </View>

            {sdkStatus.error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorLabel}>SECURITY_FAIL:</Text>
                <Text style={styles.errorMsg}>{sdkStatus.error}</Text>
              </View>
            )}

            {sdkStatus.detected && sdkStatus.status === 'AUTHORIZED' && (
              <View style={styles.contextReceipt}>
                <Text style={styles.receiptLabel}>RECEIVED_CONTEXT:</Text>
                {Object.entries(sdkStatus.context)
                  .filter(([k]) => k !== 'wsJwt')
                  .map(([k, v]) => (
                    <Text key={k} style={styles.receiptText}>{k}: {v}</Text>
                  ))}
              </View>
            )}
          </View>

          <View style={[styles.noticeSection, { flex: 1 }]}>
            <EventBoard config={eventsConfig} />
          </View>
        </View>
      </View>
    </View>
  );
}

const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7', fontFamily: APPLE_FONT },
  header: {
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    // @ts-ignore
    backdropFilter: 'blur(10px)',
    zIndex: 100,
  },
  branding: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 80, height: 60 },
  brandSubtitle: { paddingLeft: 10, fontSize: 9, fontWeight: '500', color: '#86868B', letterSpacing: 1, fontFamily: APPLE_FONT },
  headerMeta: { flexDirection: 'row', gap: 24 },
  metaText: { fontSize: 9, fontFamily: 'monospace', color: '#86868B' },
  workspace: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 380,
    padding: 30,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    zIndex: 1,
  },
  controlSection: { marginBottom: 36 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
    letterSpacing: 1.5,
    fontFamily: APPLE_FONT
  },
  profileBox: {
    padding: 20,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    fontFamily: APPLE_FONT,
  },
  profileLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#86868B',
    marginTop: 10,
    marginBottom: 4,
    fontFamily: APPLE_FONT,
    letterSpacing: 0.5,
  },
  profileKey: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#1C1C1E',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  authInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 13,
    color: '#1C1C1E',
    borderRadius: 8,
    fontFamily: APPLE_FONT,
    marginBottom: 12,
  },
  authButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  authButtonPrimary: {
    flex: 1.2,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
  },
  authButtonSecondary: {
    flex: 0.8,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
  },
  authButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: APPLE_FONT,
  },
  authButtonSecondaryText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: APPLE_FONT,
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
    borderRadius: 8,
  },
  disconnectButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: APPLE_FONT,
  },
  brutButtonMuted: {
    backgroundColor: '#86868B',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 0,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  brutButtonTextMuted: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  passkeyForm: {
    gap: 12,
  },
  brutInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13,
    color: '#000000',
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  brutButtonHalf: {
    flex: 1,
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 0,
    paddingVertical: 12,
    alignItems: 'center',
  },
  brutButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  // Intent Card Styling
  intentBox: {
    backgroundColor: '#FFF0F0',
    borderWidth: 2,
    borderColor: '#FF3B30',
    borderRadius: 0,
    padding: 20,
    marginBottom: 32,
    // Brutalist hard shadow
    // @ts-ignore
    boxShadow: '4px 4px 0px #FF3B30',
  },
  intentTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF3B30',
    marginBottom: 12,
    letterSpacing: 1,
  },
  intentDetails: {
    gap: 6,
    marginBottom: 16,
  },
  intentField: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#000000',
  },
  intentVal: {
    fontWeight: 'bold',
    color: '#000000',
  },
  intentButtonApprove: {
    flex: 1.2,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 0,
    paddingVertical: 12,
    alignItems: 'center',
  },
  intentButtonReject: {
    flex: 0.8,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 0,
    paddingVertical: 12,
    alignItems: 'center',
  },
  intentButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  inputField: { marginBottom: 24 },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#1D1D1F', marginBottom: 8, fontFamily: APPLE_FONT },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 13,
    color: '#00',
    borderRadius: 10,
    fontFamily: APPLE_FONT,
  },
  runButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    borderRadius: 12,
  },
  runButtonText: { color: '#FFF', fontSize: 13, fontWeight: '600', fontFamily: APPLE_FONT },
  collapsibleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  expandIcon: { color: '#86868B', fontSize: 20, fontWeight: '900' },
  contextHeader: { flexDirection: 'row', marginBottom: 8, gap: 10 },
  contextHeaderLabel: { flex: 1, fontSize: 8, color: '#86868B', fontWeight: 'bold' },
  contextListContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  contextRow: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'center' },
  contextInput: { flex: 1, minWidth: 0, flexShrink: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 11 },
  addButton: {
    backgroundColor: 'transparent',
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: { color: '#007AFF', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, fontFamily: APPLE_FONT },
  removeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
    borderRadius: 16,
  },
  removeButtonText: { color: '#86868B', fontSize: 12, fontWeight: '600' },
  clearSessionButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF3B30',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    borderRadius: 12,
  },
  clearSessionButtonText: { color: '#FF3B30', fontSize: 13, fontWeight: '600', fontFamily: APPLE_FONT },
  rightSidebar: {
    width: 380,
    padding: 40,
    backgroundColor: '#1C1C1E',
  },
  validationSection: { paddingTop: 0 },
  checkItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  checkDot: { width: 6, height: 6, marginRight: 12, borderRadius: 3 },
  checkDotActive: {
    shadowColor: '#34C759',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  checkDotError: {
    shadowColor: '#FF3B30',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  checkLabel: { fontSize: 12, color: '#FFFFFF', fontWeight: '500', fontFamily: APPLE_FONT },
  errorBanner: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#3A1D1D',
    borderRadius: 8,
  },
  errorLabel: { color: '#FF3B30', fontSize: 8, fontWeight: 'bold', marginBottom: 4, fontFamily: APPLE_FONT },
  errorMsg: { color: '#FF3B30', fontSize: 10, fontFamily: 'monospace' },
  contextReceipt: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
  },
  receiptLabel: { color: '#86868B', fontSize: 8, fontWeight: 'bold', marginBottom: 8, fontFamily: APPLE_FONT },
  receiptText: { color: '#34C759', fontSize: 10, fontFamily: 'monospace', marginBottom: 4 },
  noticeSection: { marginTop: 40, borderTopWidth: 0.5, borderTopColor: '#333', paddingTop: 40 },
  stage: { flex: 1, backgroundColor: '#F0F0F2' },
  sandboxContent: { flex: 1, backgroundColor: '#00' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: '#1D1D1F', marginBottom: 12, fontFamily: APPLE_FONT },
  emptyDesc: { fontSize: 14, color: '#86868B', textAlign: 'center', lineHeight: 20, maxWidth: 320, fontFamily: APPLE_FONT },
  errorText: { padding: 40, color: '#86868B', textAlign: 'center', fontFamily: APPLE_FONT },
  // Log Box
  logBox: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  logText: {
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 18,
    marginBottom: 4,
  },
  logTimestamp: {
    color: '#8E8E93',
    fontWeight: '500',
  },
  // Collapsible Component Styles
  collapsibleContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  collapsibleSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFC',
  },
  collapsibleSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: 1.5,
    fontFamily: APPLE_FONT,
  },
  collapsibleChevron: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
  collapsibleContent: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    backgroundColor: '#FFFFFF',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  loadingOverlayText: {
    color: '#34C759',
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginTop: 16,
  }
});
