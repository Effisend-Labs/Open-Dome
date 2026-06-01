import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput,
  TouchableOpacity, ScrollView, ActivityIndicator
} from 'react-native';
import { useOpenDome } from 'opendome';
import { GLOBAL_STYLES } from '../theme';

export default function UserView({ tokens, theme }) {
  const isDark = theme === 'dark';
  const { isAuthorized, user, register, login, logout } = useOpenDome();

  const [username, setUsername] = useState('');
  const [pending, setPending] = useState(false); // waiting for sandbox to respond
  const [error, setError] = useState(null);

  const handleRegister = () => {
    if (!username.trim()) {
      setError('USERNAME_REQUIRED — enter a handle to register.');
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
        /* Authorized State: Show Session & Logout */
        <View>
          <View style={[styles.card, {
            backgroundColor: tokens.SURFACE,
            borderColor: tokens.NEON_SUCCESS,
            marginBottom: 20,
            // Brutalist hard shadow — no blurred glow
            ...(isDark ? { boxShadow: `4px 4px 0px ${tokens.NEON_SUCCESS}` } : { boxShadow: '4px 4px 0px #000000' })
          }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.dot, { backgroundColor: tokens.NEON_SUCCESS }]} />
              <Text style={[styles.statusText, { color: tokens.NEON_SUCCESS }]}>
                SESSION ACTIVE
              </Text>
            </View>

            <Text style={[styles.handle, { color: tokens.FG }]}>
              @{user.username || 'unknown'}
            </Text>

            <View style={styles.divider} />

            <AddressRow label="EVM" value={user.evmAddress} tokens={tokens} />
            <AddressRow label="SOL" value={user.solanaAddress} tokens={tokens} />
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: 'transparent', borderColor: tokens.NEON_DANGER }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: tokens.NEON_DANGER }]}>
              DISCONNECT PASSPORT
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Unauthorized State: Show Login / Register */
        <View>
          <Text style={[styles.title, { color: tokens.FG }]}>SECURE PASSPORT</Text>
          <Text style={[styles.subtitle, { color: tokens.MUTED }]}>
            BIOMETRIC AUTH IS EXECUTED SECURELY BY THE PARENT SANDBOX.
          </Text>

          {/* Register */}
          <View style={[styles.card, {
            backgroundColor: tokens.SURFACE,
            borderColor: tokens.BORDER,
            // Brutalist hard offset shadow — razor-sharp, no blur
            ...(isDark ? { boxShadow: `4px 4px 0px ${tokens.NEON_PRIMARY}` } : { boxShadow: '4px 4px 0px #000000' }),
          }]}>
            <Text style={[styles.sectionLabel, { color: tokens.FG }]}>CREATE ACCOUNT</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: tokens.BG,
                borderColor: tokens.BORDER,
                color: tokens.FG,
              }]}
              value={username}
              onChangeText={setUsername}
              placeholder="username (e.g. alice)"
              placeholderTextColor={tokens.MUTED}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!pending}
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: tokens.NEON_PRIMARY, borderColor: tokens.FG }]}
              onPress={handleRegister}
              activeOpacity={0.7}
              disabled={pending}
            >
              {pending
                ? <ActivityIndicator color={isDark ? '#000' : '#fff'} size="small" />
                : <Text style={[styles.buttonText, { color: isDark ? '#000' : '#fff' }]}>
                    REGISTER WITH PASSKEY
                  </Text>
              }
            </TouchableOpacity>
          </View>

          {/* Separator */}
          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: tokens.BORDER }]} />
            <Text style={[styles.orText, { color: tokens.MUTED }]}>OR</Text>
            <View style={[styles.orLine, { backgroundColor: tokens.BORDER }]} />
          </View>

          {/* Login */}
          <TouchableOpacity
            style={[styles.button, styles.loginButton, { borderColor: tokens.BORDER }]}
            onPress={handleLogin}
            activeOpacity={0.7}
            disabled={pending}
          >
            {pending
              ? <ActivityIndicator color={tokens.FG} size="small" />
              : <Text style={[styles.buttonText, { color: tokens.FG }]}>
                  SIGN IN WITH PASSKEY
                </Text>
            }
          </TouchableOpacity>

          {/* Error */}
          {error && (
            <View style={[styles.errorBox, { borderColor: tokens.NEON_DANGER }]}>
              <Text style={[styles.errorText, { color: tokens.NEON_DANGER }]}>{error}</Text>
            </View>
          )}

          {pending && (
            <Text style={[styles.hint, { color: tokens.MUTED, marginTop: 20, textAlign: 'center' }]}>
              AWAITING BIOMETRIC VERIFICATION IN SANDBOX...
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function AddressRow({ label, value, tokens }) {
  if (!value) return null;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.addressLabel, { color: tokens.MUTED }]}>{label} ADDRESS</Text>
      <Text style={[styles.addressValue, { color: tokens.FG }]} numberOfLines={1} ellipsizeMode="middle">
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
    borderRadius: 0, // razor-sharp corners — no rounded-lg
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dot: { width: 6, height: 6, borderRadius: 0 }, // square dot — not pill
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: GLOBAL_STYLES.monospace,
    letterSpacing: 1,
  },
  handle: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: GLOBAL_STYLES.monospace,
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
    borderRadius: 0, // razor-sharp
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    fontFamily: GLOBAL_STYLES.monospace,
    marginBottom: 16,
  },
  button: {
    borderWidth: 1,
    borderRadius: 0, // razor-sharp — no pill, no rounded-lg
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
    fontFamily: GLOBAL_STYLES.monospace,
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
