import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, space, radii, type as typeTokens, shadow } from '../core/tokens';

export default function IframeContainer({
  activeUrl,
  verifiedToken,
  contextVariables = [],
  onUserAuthChanged,
  onTransactionIntent,
  onAddLog,
  gpsLocation
}) {
  const iframeRef = useRef(null);
  const [loadError, setLoadError] = useState(false);

  // Reset error state whenever we navigate to a new URL
  useEffect(() => { setLoadError(false); }, [activeUrl]);

  // Helper to extract the domain/origin of the loaded mini-app
  const getMiniAppOrigin = () => {
    if (!activeUrl) return '*';
    try {
      const url = new URL(activeUrl);
      return url.origin;
    } catch (e) {
      return '*';
    }
  };

  // Helper to verify a token against the server API
  const verifyTokenOnServer = async (token) => {
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      onAddLog(`[Bridge] API Server verify token failed: ${err.message}`);
      return null;
    }
  };

  // Relay location updates to the iframe whenever gpsLocation coordinates change
  useEffect(() => {
    if (Platform.OS !== 'web' || !activeUrl || !gpsLocation) return;

    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      const targetOrigin = getMiniAppOrigin();
      iframe.contentWindow.postMessage({
        type: 'OPENDOME_LOCATION_UPDATE',
        payload: {
          latitude: gpsLocation.latitude,
          longitude: gpsLocation.longitude,
          accuracy: 5,
          timestamp: Date.now()
        }
      }, targetOrigin);
    }
  }, [gpsLocation, activeUrl]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !activeUrl) return;

    const handleMessage = async (event) => {
      if (!event.data) return;

      const origin = event.origin;
      const targetOrigin = getMiniAppOrigin();

      // Only listen to messages from the active iframe/mini-app
      if (targetOrigin !== '*' && origin !== targetOrigin) {
        return;
      }

      const { type, token: appDebugToken, appId, payload, status } = event.data;

      // 1. Ready Handshake Request
      if (type === 'OPENDOME_READY') {
        onAddLog(`[Bridge] Received OPENDOME_READY from Mini App (AppId="${appId || 'unknown'}")`);
        
        const iframe = document.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
          // Build context object
          const contextObj = {};
          contextVariables.forEach(row => {
            if (row.key) contextObj[row.key] = row.value;
          });

          onAddLog('[Bridge] Validating App Token on server...');
          const appRes = await verifyTokenOnServer(appDebugToken);

          if (appRes && appRes.wsJwt) {
            const wsJwt = appRes.wsJwt;
            onAddLog(`[Bridge] App verified. wsJwt generated successfully.`);

            // Check if there is an active Host User Session
            if (verifiedToken) {
              onAddLog(`[Bridge] User session found. Verifying credentials...`);
              const userRes = await verifyTokenOnServer(verifiedToken);
              
              if (userRes && userRes.authenticated) {
                onAddLog(`[Bridge] Handshake SUCCESS: Verified User @${userRes.username}. Injecting wallets.`);
                iframe.contentWindow.postMessage({
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
                }, origin);

                // Sync profile state back
                onUserAuthChanged({
                  token: userRes.token,
                  profile: {
                    username: userRes.username,
                    evmAddress: userRes.evmAddress,
                    solanaAddress: userRes.solanaAddress
                  },
                  jwt: wsJwt
                });
                return;
              }
            }

            // Fallback: Guest Mode Handshake
            onAddLog('[Bridge] Handshake SUCCESS: Guest Mode (no user active).');
            iframe.contentWindow.postMessage({
              type: 'OPENDOME_HANDSHAKE',
              status: 'UNAUTHENTICATED',
              payload: null,
              user: null,
              context: {
                ...contextObj,
                wsJwt
              }
            }, origin);
          } else {
            onAddLog('[Bridge] Handshake FAILED: App Token is invalid.');
            iframe.contentWindow.postMessage({
              type: 'OPENDOME_HANDSHAKE',
              status: 'UNAUTHORIZED',
              error: 'INVALID_TOKEN'
            }, origin);
          }
        }
      }

      // 2. Transaction Intent Request
      if (type === 'OPENDOME_INTENT_REQUEST') {
        const { chain, to, amount } = payload;
        onAddLog(`[Bridge] Received transaction intent: Send ${amount} ${chain.toUpperCase()} to ${to.slice(0, 10)}...`);
        onTransactionIntent({ chain, to, amount });
      }

      // 3. Delegated Authentication Request (Register)
      if (type === 'OPENDOME_REGISTER_REQUEST') {
        const { username } = payload;
        onAddLog(`[Bridge] Delegated REGISTER requested for username "${username}"`);
        
        try {
          const optRes = await fetch('/api/passkey/register-options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username.trim() })
          });
          if (!optRes.ok) throw new Error('Failed to fetch registration options');
          
          const { options, userId } = await optRes.json();
          const WebAuthn = require('@simplewebauthn/browser');
          const credential = await WebAuthn.startRegistration({ optionsJSON: options });
          
          const verifyRes = await fetch('/api/passkey/register-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, credentialResponse: credential })
          });
          if (!verifyRes.ok) throw new Error('Registration verification failed');
          
          const verifyResult = await verifyRes.json();
          if (verifyResult.verified && verifyResult.token) {
            onAddLog(`[Bridge] Delegated Registration complete. Dispatched Success.`);
            const userProfile = await verifyTokenOnServer(verifyResult.token);
            
            const iframe = document.querySelector('iframe');
            if (iframe && iframe.contentWindow && userProfile) {
              iframe.contentWindow.postMessage({
                type: 'OPENDOME_REGISTER_RESPONSE',
                status: 'SUCCESS',
                payload: { token: verifyResult.token },
                user: {
                  username: userProfile.username,
                  evmAddress: userProfile.evmAddress,
                  solanaAddress: userProfile.solanaAddress
                },
                context: { wsJwt: userProfile.wsJwt }
              }, origin);

              onUserAuthChanged({
                token: verifyResult.token,
                profile: {
                  username: userProfile.username,
                  evmAddress: userProfile.evmAddress,
                  solanaAddress: userProfile.solanaAddress
                },
                jwt: userProfile.wsJwt
              });
            }
          }
        } catch (err) {
          onAddLog(`[Bridge] Delegated REGISTER Failed: ${err.message}`);
          const iframe = document.querySelector('iframe');
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'OPENDOME_REGISTER_RESPONSE',
              status: 'ERROR',
              error: err.message
            }, origin);
          }
        }
      }

      // 4. Delegated Authentication Request (Login)
      if (type === 'OPENDOME_LOGIN_REQUEST') {
        onAddLog(`[Bridge] Delegated LOGIN requested by Mini App`);
        
        try {
          const optRes = await fetch('/api/passkey/login-options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          if (!optRes.ok) throw new Error('Failed to fetch login options');
          
          const { options, challengeId } = await optRes.json();
          const WebAuthn = require('@simplewebauthn/browser');
          const assertion = await WebAuthn.startAuthentication({ optionsJSON: options });
          
          const verifyRes = await fetch('/api/passkey/login-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ challengeId, assertionResponse: assertion })
          });
          if (!verifyRes.ok) throw new Error('Login verification failed');
          
          const verifyResult = await verifyRes.json();
          if (verifyResult.verified && verifyResult.token) {
            onAddLog(`[Bridge] Delegated Authentication complete. Dispatched Success.`);
            const userProfile = await verifyTokenOnServer(verifyResult.token);
            
            const iframe = document.querySelector('iframe');
            if (iframe && iframe.contentWindow && userProfile) {
              iframe.contentWindow.postMessage({
                type: 'OPENDOME_LOGIN_RESPONSE',
                status: 'SUCCESS',
                payload: { token: verifyResult.token },
                user: {
                  username: userProfile.username,
                  evmAddress: userProfile.evmAddress,
                  solanaAddress: userProfile.solanaAddress
                },
                context: { wsJwt: userProfile.wsJwt }
              }, origin);

              onUserAuthChanged({
                token: verifyResult.token,
                profile: {
                  username: userProfile.username,
                  evmAddress: userProfile.evmAddress,
                  solanaAddress: userProfile.solanaAddress
                },
                jwt: userProfile.wsJwt
              });
            }
          }
        } catch (err) {
          onAddLog(`[Bridge] Delegated LOGIN Failed: ${err.message}`);
          const iframe = document.querySelector('iframe');
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'OPENDOME_LOGIN_RESPONSE',
              status: 'ERROR',
              error: err.message
            }, origin);
          }
        }
      }

      // 5. Logout request
      if (type === 'OPENDOME_LOGOUT') {
        onAddLog('[Bridge] Received logout command. Resetting Host user profile.');
        onUserAuthChanged({ token: null, profile: null, jwt: null });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeUrl, verifiedToken, contextVariables]);

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.nativeFallback} accessibilityRole="alert">
        <Ionicons name="phone-portrait-outline" size={32} color={colors.text.muted} />
        <Text style={styles.fallbackTitle}>Native WebView Container</Text>
        <Text style={styles.fallbackText}>
          Open-Dome mini-apps are fully optimized for web view docking interfaces. Please deploy or run on Web to view this interactive experience.
        </Text>
        <Text style={styles.urlText} accessibilityLabel={`Target URL: ${activeUrl || 'None'}`}>
          Target URL: {activeUrl || 'None'}
        </Text>
      </View>
    );
  }

  if (!activeUrl) {
    return (
      <View style={styles.placeholder}>
        <Ionicons name="grid-outline" size={28} color={colors.text.muted} />
        <Text style={styles.placeholderText}>
          Select a Mini App from the grid launchpad to mount the container.
        </Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.placeholder} accessibilityRole="alert">
        <Ionicons name="cloud-offline-outline" size={28} color={colors.status.danger} />
        <Text style={styles.errorTitle}>Mini App Unreachable</Text>
        <Text style={styles.placeholderText}>{activeUrl}</Text>
        <Pressable
          style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]}
          onPress={() => {
            setLoadError(false);
            if (iframeRef.current) {
              const src = iframeRef.current.src;
              iframeRef.current.src = '';
              iframeRef.current.src = src;
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Retry loading mini app"
        >
          <Ionicons name="refresh" size={12} color={colors.text.onAccent} />
          <Text style={styles.retryBtnText}>RETRY</Text>
        </Pressable>
      </View>
    );
  }

  const iframeSrc = `${activeUrl}?parentOrigin=${encodeURIComponent(window.location.origin)}`;

  return (
    <iframe
      ref={iframeRef}
      src={iframeSrc}
      style={styles.iframe}
      title="Open-Dome Active Mini App"
      allow="geolocation"
      onError={() => setLoadError(true)}
    />
  );
}

const styles = StyleSheet.create({
  iframe: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
    backgroundColor: colors.bg.canvas,
    borderRadius: radii.md,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.nested,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    padding: space.xxl,
    gap: space.md,
  },
  placeholderText: {
    color: colors.text.muted,
    fontSize: typeTokens.body,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: typeTokens.body + 5,
  },
  errorTitle: {
    color: colors.text.primary,
    fontSize: typeTokens.base,
    fontWeight: '700',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.status.danger,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radii.sm,
    marginTop: space.sm,
  },
  retryBtnText: {
    color: colors.text.onAccent,
    fontSize: typeTokens.micro + 1,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  nativeFallback: {
    flex: 1,
    backgroundColor: colors.bg.nested,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    padding: space.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.md,
  },
  fallbackTitle: {
    color: colors.text.primary,
    fontSize: typeTokens.lead,
    fontWeight: '700',
  },
  fallbackText: {
    color: colors.text.muted,
    fontSize: typeTokens.body,
    textAlign: 'center',
    lineHeight: typeTokens.body + 5,
  },
  urlText: {
    color: colors.brand.alt,
    fontFamily: 'monospace',
    fontSize: typeTokens.small,
  },
});
