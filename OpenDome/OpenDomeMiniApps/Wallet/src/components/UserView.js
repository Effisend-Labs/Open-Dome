import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput,
  TouchableOpacity, ScrollView, ActivityIndicator
} from 'react-native';
import { useOpenDome } from 'opendome';
import { GLOBAL_STYLES } from '../theme';

export default function UserView({ tokens, theme, t, isDark }) {
  const { isAuthorized, user, register, login, logout } = useOpenDome();

  const [username, setUsername] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const handleRegister = () => {
    if (!username.trim()) {
      setError(t.userProfile?.usernameRequired || 'Enter a username to register.');
      return;
    }
    setError(null);
    setPending(true);
    register(username.trim().toLowerCase());
  };

  const handleLogin = () => {
    setError(null);
    setPending(true);
    login();
  };

  const handleLogout = () => {
    setUsername('');
    setPending(false);
    setError(null);
    logout();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.BG }}
      contentContainerStyle={{ padding: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      {isAuthorized && user ? (
        /* ── Authenticated ──────────────────────────────────────────── */
        <View>
          <View style={[styles.card, {
            backgroundColor: tokens.SURFACE,
            borderRadius: tokens.shape.cardRadius,
            ...tokens.shadow.card
          }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.dot, { backgroundColor: tokens.SUCCESS }]} />
              <Text style={[styles.statusText, { color: tokens.SUCCESS, fontFamily: tokens.font.primary }]}>
                {t.userProfile?.sessionActive || 'Session active'}
              </Text>
            </View>

            <Text style={[styles.handle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
              @{user.username || 'unknown'}
            </Text>

            <View style={[styles.divider, { backgroundColor: tokens.BORDER }]} />

            <AddressRow label="EVM" value={user.evmAddress} tokens={tokens} t={t} />
            <AddressRow label="SOL" value={user.solanaAddress} tokens={tokens} t={t} />
          </View>

          <TouchableOpacity
            style={[styles.button, {
              backgroundColor: 'transparent',
              borderColor: tokens.DANGER,
              borderRadius: tokens.shape.buttonRadius,
              marginTop: 20,
            }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: tokens.DANGER, fontFamily: tokens.font.primary }]}>
              {t.userProfile?.disconnect || 'Disconnect'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Not Authenticated ──────────────────────────────────────── */
        <View>
          <Text style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
            {t.userProfile?.securePassport || 'Secure Passport'}
          </Text>
          <Text style={[styles.subtitle, { color: tokens.FG_SECONDARY || tokens.MUTED, fontFamily: tokens.font.primary }]}>
            {t.userProfile?.bioAuthMsg || 'Biometric auth is securely handled by the sandbox.'}
          </Text>

          {/* Register */}
          <View style={[styles.card, {
            backgroundColor: tokens.SURFACE,
            borderRadius: tokens.shape.cardRadius,
            ...tokens.shadow.card
          }]}>
            <Text style={[styles.sectionLabel, { color: tokens.FG_SECONDARY || tokens.MUTED, fontFamily: tokens.font.primary }]}>
              {t.userProfile?.createAccount || 'Create account'}
            </Text>
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
              editable={!pending}
            />

            <TouchableOpacity
              style={[styles.button, {
                backgroundColor: tokens.ACCENT,
                borderColor: tokens.ACCENT,
                borderRadius: tokens.shape.buttonRadius,
              }]}
              onPress={handleRegister}
              activeOpacity={0.7}
              disabled={pending}
            >
              {pending
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={[styles.buttonText, { color: '#FFFFFF', fontFamily: tokens.font.primary }]}>
                    {t.userProfile?.registerBtn || 'Register with Passkey'}
                  </Text>
              }
            </TouchableOpacity>
          </View>

          {/* Separator */}
          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: tokens.BORDER }]} />
            <Text style={[styles.orText, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
              {t.userProfile?.or || 'or'}
            </Text>
            <View style={[styles.orLine, { backgroundColor: tokens.BORDER }]} />
          </View>

          {/* Login */}
          <TouchableOpacity
            style={[styles.button, styles.loginButton, {
              borderColor: tokens.BORDER,
              borderRadius: tokens.shape.buttonRadius,
            }]}
            onPress={handleLogin}
            activeOpacity={0.7}
            disabled={pending}
          >
            {pending
              ? <ActivityIndicator color={tokens.FG} size="small" />
              : <Text style={[styles.buttonText, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
                  {t.userProfile?.signInBtn || 'Sign in with Passkey'}
                </Text>
            }
          </TouchableOpacity>

          {/* Error */}
          {error && (
            <View style={[styles.errorBox, {
              backgroundColor: tokens.DANGER_SOFT || 'rgba(220, 38, 38, 0.06)',
              borderColor: tokens.DANGER,
              borderRadius: tokens.shape.buttonRadius,
            }]}>
              <Text style={[styles.errorText, { color: tokens.DANGER, fontFamily: tokens.font.mono }]}>
                {error}
              </Text>
            </View>
          )}

          {pending && (
            <Text style={[styles.hint, { color: tokens.MUTED, marginTop: 20, textAlign: 'center', fontFamily: tokens.font.primary }]}>
              {t.userProfile?.awaitingBio || 'Awaiting biometric verification...'}
            </Text>
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
      <Text style={[styles.addressLabel, { color: tokens.FG_SECONDARY || tokens.MUTED, fontFamily: tokens.font.primary }]}>
        {label} {t?.userProfile?.address || 'Address'}
      </Text>
      <Text style={[styles.addressValue, { color: tokens.FG, fontFamily: tokens.font.mono }]} numberOfLines={1} ellipsizeMode="middle">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: -0.1,
    marginBottom: 24,
  },
  card: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  handle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginBottom: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  addressValue: {
    fontSize: 11,
    fontFamily: GLOBAL_STYLES.monospace,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
    marginBottom: 12,
    textTransform: 'uppercase',
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
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 10,
  },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: {
    fontSize: 11,
    fontWeight: '500',
  },
  errorBox: {
    marginTop: 16,
    borderWidth: 1,
    padding: 12,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
  },
});
