import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, Pressable, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSmartSize } from '../providers/smartProvider';
import { useTheme } from '../providers/ThemeProvider';

let startRegistration, startAuthentication;
if (Platform.OS === 'web') {
  try {
    const WebAuthn = require('@simplewebauthn/browser');
    startRegistration = WebAuthn.startRegistration;
    startAuthentication = WebAuthn.startAuthentication;
  } catch (err) {
    console.error('Failed to load simplewebauthn in web browser context:', err);
  }
}

export default function PasskeyAuth({ onAuthSuccess, addLog }) {
  const { normalize: n } = useSmartSize();
  const { colors: theme, isDark } = useTheme();

  const defaultFont = Platform.select({
    ios: 'System',
    web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
    default: 'sans-serif',
  });

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.bg.card,
      borderRadius: theme.shape?.cardRadius ?? n(24),
      borderWidth: 1,
      borderColor: theme.border.subtle,
      overflow: 'hidden',
      width: '100%',
      ...(theme.shadow?.card || {}),
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: theme.bg.nested,
      margin: n(20),
      marginBottom: 0,
      padding: n(4),
      borderRadius: n(12),
      borderWidth: 1,
      borderColor: theme.border.default,
    },
    tabButton: {
      flex: 1,
      paddingVertical: n(8),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: n(8),
    },
    activeTab: {
      backgroundColor: theme.bg.card,
      ...(theme.shadow?.sm || {
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 1
      }),
    },
    tabText: {
      color: theme.text.secondary,
      fontSize: n(14),
      fontWeight: '600',
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    activeTabText: {
      color: theme.text.primary,
    },
    cardContent: {
      padding: n(24),
      gap: n(16),
    },
    inputWrapper: {
      gap: n(6),
    },
    label: {
      color: theme.text.secondary,
      fontSize: n(12),
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    textInput: {
      backgroundColor: theme.bg.canvas,
      color: theme.text.primary,
      borderWidth: 1,
      borderColor: theme.border.default,
      borderRadius: n(12),
      paddingVertical: n(12),
      paddingHorizontal: n(16),
      fontSize: n(16),
      fontFamily: theme.typography?.fontFamilyCode || 'monospace',
    },
    actionButton: {
      backgroundColor: theme.text.accent || '#007AFF',
      borderRadius: n(14),
      paddingVertical: n(14),
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButtonText: {
      color: theme.text.buttonText || (isDark ? '#000000' : '#FFFFFF'),
      fontSize: n(15),
      fontWeight: '700',
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 59, 48, 0.1)',
      padding: n(12),
      borderRadius: n(12),
      borderWidth: 1,
      borderColor: theme.status?.danger || '#FF3B30',
    },
    errorText: {
      color: theme.status?.danger || '#FF3B30',
      fontSize: n(13),
      fontFamily: theme.typography?.fontFamily || defaultFont,
      marginLeft: n(6),
      flexShrink: 1,
    },
    spinner: {
      marginVertical: n(12),
    },
  });

  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  const handleRegister = async () => {
    if (!usernameInput.trim()) {
      setErrorMsg('Username is required for registration.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    addLog(`[Passkey] Registering user "${usernameInput}"...`);

    try {
      if (Platform.OS !== 'web' || !startRegistration) {
        throw new Error('WebAuthn is only supported in web environments currently.');
      }

      // 1. Get options from server
      const optRes = await fetch('/api/passkey/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput.trim() })
      });

      if (!optRes.ok) {
        const errText = await optRes.text();
        throw new Error(errText || `Failed to fetch registration options (${optRes.status})`);
      }

      const { options, userId } = await optRes.json();
      addLog(`[Passkey] Received registration options for user_${userId}`);

      // 2. Prompt authenticator
      const credential = await startRegistration({ optionsJSON: options });
      addLog(`[Passkey] Authenticator success: ${credential.id.slice(0, 12)}...`);

      // 3. Verify on server
      const verifyRes = await fetch('/api/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, credentialResponse: credential })
      });

      if (!verifyRes.ok) {
        const errText = await verifyRes.text();
        throw new Error(errText || `Registration verification failed (${verifyRes.status})`);
      }

      const verifyResult = await verifyRes.json();
      if (verifyResult.verified && verifyResult.token) {
        addLog('[Passkey] Registration verified. Saving session...');
        onAuthSuccess(verifyResult.token);
      } else {
        throw new Error('Verification returned unverified status');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      addLog(`[Passkey] ERROR during registration: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    addLog('[Passkey] Initiating authentication flow...');

    try {
      if (Platform.OS !== 'web' || !startAuthentication) {
        throw new Error('WebAuthn is only supported in web environments.');
      }

      // 1. Get options
      const optRes = await fetch('/api/passkey/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!optRes.ok) {
        const errText = await optRes.text();
        throw new Error(errText || `Failed to fetch login options (${optRes.status})`);
      }

      const { options, challengeId } = await optRes.json();
      addLog(`[Passkey] Received authentication challenge (ID: ${challengeId.slice(0, 8)}...)`);

      // 2. Prompt authenticator
      const assertion = await startAuthentication({ optionsJSON: options });
      addLog(`[Passkey] Assertion received: ${assertion.id.slice(0, 12)}...`);

      // 3. Verify on server
      const verifyRes = await fetch('/api/passkey/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, assertionResponse: assertion })
      });

      if (!verifyRes.ok) {
        const errText = await verifyRes.text();
        throw new Error(errText || `Login verification failed (${verifyRes.status})`);
      }

      const verifyResult = await verifyRes.json();
      if (verifyResult.verified && verifyResult.token) {
        addLog('[Passkey] Login verified successfully. Loading profile...');
        onAuthSuccess(verifyResult.token);
      } else {
        throw new Error('Verification returned unverified login status');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      addLog(`[Passkey] ERROR during login: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <Pressable 
          style={[styles.tabButton, mode === 'login' && styles.activeTab]}
          onPress={() => { setMode('login'); setErrorMsg(''); }}
        >
          <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>Login</Text>
        </Pressable>
        <Pressable 
          style={[styles.tabButton, mode === 'register' && styles.activeTab]}
          onPress={() => { setMode('register'); setErrorMsg(''); }}
        >
          <Text style={[styles.tabText, mode === 'register' && styles.activeTabText]}>Register</Text>
        </Pressable>
      </View>

      <View style={styles.cardContent}>
        {mode === 'register' && (
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Choose Username</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. victor_altaga"
              placeholderTextColor={theme.text.muted || '#8E8E93'}
              value={usernameInput}
              onChangeText={setUsernameInput}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              accessibilityLabel="Username"
            />
          </View>
        )}

        {errorMsg ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Ionicons name="warning" size={n(16)} color={theme.status?.danger || '#FF3B30'} style={{ marginRight: 4 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator size="small" color={theme.text.accent} style={styles.spinner} />
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }
            ]}
            onPress={mode === 'login' ? handleLogin : handleRegister}
            accessibilityRole="button"
            accessibilityLabel={mode === 'login' ? 'Sign in with passkey' : 'Create passkey'}
          >
            <Text style={styles.actionButtonText}>
              {mode === 'login' ? 'Sign In with Passkey' : 'Create Passkey'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

