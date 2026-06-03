import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, Pressable, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, space, radii, type as typeTokens } from '../core/tokens';

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
              placeholderTextColor={colors.text.disabled}
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
            <Ionicons name="warning" size={12} color={colors.status.danger} style={{ marginRight: 4 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator size="small" color={colors.brand.alt} style={styles.spinner} />
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.modal,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
    width: '100%',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    backgroundColor: colors.bg.nested,
  },
  tabButton: {
    flex: 1,
    paddingVertical: space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: colors.bg.modal,
    borderBottomWidth: 2,
    borderBottomColor: colors.brand.alt,
  },
  tabText: {
    color: colors.text.muted,
    fontSize: typeTokens.body,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.text.primary,
  },
  cardContent: {
    padding: space.xl,
    gap: space.lg,
  },
  inputWrapper: {
    gap: 6,
  },
  label: {
    color: colors.text.muted,
    fontSize: typeTokens.micro,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: colors.bg.canvas,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.sm,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    fontSize: typeTokens.base,
    fontFamily: 'monospace',
  },
  actionButton: {
    backgroundColor: colors.brand.alt,
    borderRadius: radii.sm,
    paddingVertical: space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: colors.text.onAccent,
    fontSize: typeTokens.body,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    padding: space.sm + 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.status.danger,
  },
  errorText: {
    color: colors.status.danger,
    fontSize: typeTokens.small + 1,
    lineHeight: 16,
    flexShrink: 1,
  },
  spinner: {
    marginVertical: space.sm,
  },
});
