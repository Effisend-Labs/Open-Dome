import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';

export function AccountView({ tokens, isAuthorized, user, register, login, logout }) {
  const [username, setUsername] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const handleRegister = () => {
    if (!username.trim()) {
      setError('Enter a username to register.');
      return;
    }
    setError(null);
    setPending(true);
    register(username.trim().toLowerCase());
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.BG }}
      contentContainerStyle={{ padding: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      {isAuthorized && user ? (
        <View>
          <View
            style={[
              styles.card,
              { backgroundColor: tokens.SURFACE, borderRadius: tokens.shape.cardRadius, ...tokens.shadow.card },
            ]}
          >
            <Text style={[styles.status, { color: tokens.SUCCESS, fontFamily: tokens.font.primary }]}>
              Session active
            </Text>
            <Text style={[styles.handle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
              @{user.username || 'unknown'}
            </Text>
            {user.evmAddress ? (
              <Text style={[styles.addr, { color: tokens.MUTED, fontFamily: tokens.font.mono }]} numberOfLines={1}>
                {user.evmAddress}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.button, { borderColor: tokens.DANGER, borderRadius: tokens.shape.buttonRadius }]}
            onPress={() => {
              setPending(false);
              setError(null);
              logout();
            }}
          >
            <Text style={[styles.buttonText, { color: tokens.DANGER, fontFamily: tokens.font.primary }]}>
              Disconnect
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
            Secure Passport
          </Text>
          <Text style={[styles.subtitle, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
            Passkey auth is handled by the OpenDome host. Needed to sign x402 message bills.
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: tokens.SURFACE, borderRadius: tokens.shape.cardRadius, ...tokens.shadow.card },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: tokens.BG,
                  borderColor: tokens.BORDER,
                  color: tokens.FG,
                  borderRadius: tokens.shape.buttonRadius,
                  fontFamily: tokens.font.mono,
                },
              ]}
              value={username}
              onChangeText={setUsername}
              placeholder="username (e.g. alice)"
              placeholderTextColor={tokens.MUTED}
              autoCapitalize="none"
              editable={!pending}
            />
            <TouchableOpacity
              style={[styles.buttonFill, { backgroundColor: tokens.ACCENT, borderRadius: tokens.shape.buttonRadius }]}
              onPress={handleRegister}
              disabled={pending}
            >
              {pending ? <ActivityIndicator color="#fff" /> : (
                <Text style={[styles.buttonText, { color: '#fff', fontFamily: tokens.font.primary }]}>
                  Register with Passkey
                </Text>
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.button, { borderColor: tokens.BORDER, borderRadius: tokens.shape.buttonRadius, marginTop: 16 }]}
            onPress={() => {
              setError(null);
              setPending(true);
              login();
            }}
            disabled={pending}
          >
            {pending ? <ActivityIndicator color={tokens.FG} /> : (
              <Text style={[styles.buttonText, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
                Sign in with Passkey
              </Text>
            )}
          </TouchableOpacity>
          {error ? (
            <Text style={[styles.error, { color: tokens.DANGER, fontFamily: tokens.font.mono }]}>{error}</Text>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '600', marginBottom: 6 },
  subtitle: { fontSize: 13, lineHeight: 18, marginBottom: 20 },
  card: { padding: 20 },
  status: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  handle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.6 },
  addr: { fontSize: 11, marginTop: 10 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, marginBottom: 16 },
  button: { borderWidth: 1, paddingVertical: 14, alignItems: 'center', marginTop: 20, backgroundColor: 'transparent' },
  buttonFill: { paddingVertical: 14, alignItems: 'center' },
  buttonText: { fontSize: 13, fontWeight: '600' },
  error: { marginTop: 16, fontSize: 12 },
});
