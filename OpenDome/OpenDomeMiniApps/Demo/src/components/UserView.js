import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput,
  TouchableOpacity, ScrollView, ActivityIndicator
} from 'react-native';
import { useOpenDome } from 'opendome';
import { GLOBAL_STYLES } from '../theme';

export default function UserView({ tokens, theme, t }) {
  const isDark = theme === 'dark';
  const { isAuthorized, user, register, login, logout, authError, authPending } = useOpenDome();

  const [username, setUsername] = useState('');
  const [localError, setLocalError] = useState(null);

  // Derive the active error to display (SDK error takes precedence over local form errors)
  const displayError = authError || localError;

  const handleRegister = () => {
    if (!username.trim()) {
      setLocalError(t.userProfile?.usernameRequired || 'USERNAME_REQUIRED — enter a handle to register.');
      return;
    }
    setLocalError(null);
    register(username.trim().toLowerCase());
  };

  const handleLogin = () => {
    setLocalError(null);
    login();
  };

  const handleLogout = () => {
    setUsername('');
    setLocalError(null);
    logout();
  };

  const handleDebugDelete = async () => {
    if (!username.trim()) {
      setLocalError('DEBUG: Enter username above to nuke first');
      return;
    }
    setLocalError('Nuking via Sandbox...');
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'OPENDOME_DEBUG_DELETE_USER',
        payload: { username: username.trim().toLowerCase() }
      }, '*'); // Wildcard because it's a debug command
      
      // Simulate success since we just send the message
      setTimeout(() => setLocalError(`[DEBUG] Nuke signal sent for ${username}`), 500);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.BG }}
      contentContainerStyle={{ padding: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      {isAuthorized && user ? (
        /* Authorized State: Show Session & Logout */
        <View>
          <View style={[styles.card, {
            backgroundColor: tokens.SURFACE,
            borderColor: tokens.BORDER,
            marginBottom: 20,
            borderRadius: tokens.shape.cardRadius,
            ...tokens.shadow.card
          }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.dot, { backgroundColor: tokens.NEON_SUCCESS, borderRadius: tokens.shape.pillRadius }]} />
              <Text style={[styles.statusText, { color: tokens.NEON_SUCCESS, fontFamily: tokens.font.primary }]}>
                {t.userProfile?.sessionActive || 'SESSION ACTIVE'}
              </Text>
            </View>

            <Text style={[styles.handle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
              @{user.username || 'unknown'}
            </Text>

            <View style={styles.divider} />

            <AddressRow label="EVM" value={user.evmAddress} tokens={tokens} t={t} />
            <AddressRow label="SOL" value={user.solanaAddress} tokens={tokens} t={t} />
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: 'transparent', borderColor: tokens.NEON_DANGER, borderRadius: tokens.shape.buttonRadius }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: tokens.NEON_DANGER, fontFamily: tokens.font.primary }]}>
              {t.userProfile?.disconnect || 'DISCONNECT PASSPORT'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Unauthorized State: Show Login / Register */
        <View>
          <Text style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]}>{t.userProfile?.securePassport || 'SECURE PASSPORT'}</Text>
          <Text style={[styles.subtitle, { color: tokens.MUTED, fontFamily: tokens.font.mono }]}>
            {t.userProfile?.bioAuthMsg || 'BIOMETRIC AUTH IS EXECUTED SECURELY BY THE PARENT SANDBOX.'}
          </Text>

          {/* Register */}
          <View style={[styles.card, {
            backgroundColor: tokens.SURFACE,
            borderColor: tokens.BORDER,
            borderRadius: tokens.shape.cardRadius,
            ...tokens.shadow.card
          }]}>
            <Text style={[styles.sectionLabel, { color: tokens.FG, fontFamily: tokens.font.primary }]}>{t.userProfile?.createAccount || 'CREATE ACCOUNT'}</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: tokens.BG,
                borderColor: tokens.BORDER,
                color: tokens.FG,
                borderRadius: tokens.shape.buttonRadius,
                fontFamily: tokens.font.mono
              }]}
              value={username}
              onChangeText={setUsername}
              placeholder={t.userProfile?.usernamePlaceholder || 'username (e.g. alice)'}
              placeholderTextColor={tokens.MUTED}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!authPending}
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: tokens.NEON_PRIMARY, borderColor: tokens.NEON_PRIMARY, borderRadius: tokens.shape.buttonRadius }]}
              onPress={handleRegister}
              activeOpacity={0.7}
              disabled={authPending}
            >
              {authPending
                ? <ActivityIndicator color={isDark ? '#000' : '#fff'} size="small" />
                : <Text style={[styles.buttonText, { color: isDark ? '#000' : '#fff', fontFamily: tokens.font.primary }]}>
                    {t.userProfile?.registerBtn || 'REGISTER WITH PASSKEY'}
                  </Text>
              }
            </TouchableOpacity>
          </View>

          {/* Separator */}
          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: tokens.BORDER }]} />
            <Text style={[styles.orText, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>{t.userProfile?.or || 'OR'}</Text>
            <View style={[styles.orLine, { backgroundColor: tokens.BORDER }]} />
          </View>

          {/* Login */}
          <TouchableOpacity
            style={[styles.button, styles.loginButton, { borderColor: tokens.BORDER, borderRadius: tokens.shape.buttonRadius }]}
            onPress={handleLogin}
            activeOpacity={0.7}
            disabled={authPending}
          >
            {authPending
              ? <ActivityIndicator color={tokens.FG} size="small" />
              : <Text style={[styles.buttonText, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
                  {t.userProfile?.signInBtn || 'SIGN IN WITH PASSKEY'}
                </Text>
            }
          </TouchableOpacity>

          {/* Error */}
          {displayError && (
            <View style={[styles.errorBox, { borderColor: tokens.NEON_DANGER, borderRadius: tokens.shape.cardRadius / 2 }]}>
              <Text style={[styles.errorText, { color: tokens.NEON_DANGER, fontFamily: tokens.font.mono }]}>{displayError}</Text>
            </View>
          )}

          {authPending && (
            <Text style={[styles.hint, { color: tokens.MUTED, marginTop: 20, textAlign: 'center', fontFamily: tokens.font.mono }]}>
              {t.userProfile?.awaitingBio || 'AWAITING BIOMETRIC VERIFICATION IN SANDBOX...'}
            </Text>
          )}

          {__DEV__ && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: 'transparent', marginTop: 20, borderColor: tokens.NEON_DANGER, borderRadius: tokens.shape.buttonRadius }]}
              onPress={handleDebugDelete}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: tokens.NEON_DANGER, fontFamily: tokens.font.primary }]}>
                [DEBUG] NUKE USER "{username || '?'}"
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function AddressRow({ label, value, tokens, t }) {
  if (!value) return null;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.addressLabel, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>{label} {t?.userProfile?.address || 'ADDRESS'}</Text>
      <Text style={[styles.addressValue, { color: tokens.FG, fontFamily: tokens.font.mono }]} numberOfLines={1} ellipsizeMode="middle">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: GLOBAL_STYLES.monospace,
    letterSpacing: 1,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 8,
    fontFamily: GLOBAL_STYLES.monospace,
    letterSpacing: 0.5,
    lineHeight: 13,
    marginBottom: 24,
  },
  card: {
    padding: 20,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dot: { width: 6, height: 6 },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  handle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(128,128,128,0.2)',
    marginBottom: 16,
  },
  addressLabel: {
    fontSize: 8,
    fontWeight: '700',
    fontFamily: GLOBAL_STYLES.monospace,
    letterSpacing: 1,
    marginBottom: 3,
  },
  addressValue: {
    fontSize: 10,
    fontFamily: GLOBAL_STYLES.monospace,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: GLOBAL_STYLES.monospace,
    letterSpacing: 1,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    marginBottom: 16,
  },
  button: {
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButton: {
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 10,
  },
  orLine: { flex: 1, height: 1 },
  orText: {
    fontSize: 8,
    fontFamily: GLOBAL_STYLES.monospace,
    fontWeight: '700',
  },
  errorBox: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 0,
    padding: 12,
  },
  errorText: {
    fontSize: 9,
    fontFamily: GLOBAL_STYLES.monospace,
    fontWeight: '700',
  },
  hint: {
    fontSize: 9,
    fontFamily: GLOBAL_STYLES.monospace,
    lineHeight: 14,
  },
});
