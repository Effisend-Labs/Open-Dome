import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';

export function SignInForm({ tokens, register, login }) {
  const [username, setUsername] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  return (
    <View>
      <TextInput
        style={[styles.field, { backgroundColor: tokens.SURFACE, color: tokens.FG }]}
        value={username}
        onChangeText={(text) => {
          setUsername(text);
          if (error) setError(null);
        }}
        placeholder="Username"
        placeholderTextColor={tokens.MUTED}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!pending}
      />

      <Pressable
        style={[styles.primary, { backgroundColor: tokens.FG }]}
        disabled={pending}
        onPress={() => {
          if (!username.trim()) {
            setError('Need a username first.');
            return;
          }
          setError(null);
          setPending(true);
          register(username.trim().toLowerCase());
        }}
      >
        {pending ? (
          <ActivityIndicator color={tokens.BG} />
        ) : (
          <Text style={[styles.primaryText, { color: tokens.BG }]}>Create passkey</Text>
        )}
      </Pressable>

      <Pressable
        disabled={pending}
        onPress={() => {
          setError(null);
          setPending(true);
          login();
        }}
        style={styles.existing}
      >
        <Text style={[styles.existingText, { color: tokens.FG_SECONDARY }]}>
          I already have a passkey
        </Text>
      </Pressable>

      {error ? (
        <Text style={[styles.error, { color: tokens.DANGER }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    fontSize: 16,
    outlineStyle: 'none',
  },
  primary: {
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  primaryText: { fontSize: 16, fontWeight: '600' },
  existing: { paddingTop: 16, paddingBottom: 4, alignSelf: 'flex-start' },
  existingText: { fontSize: 15 },
  error: { fontSize: 14, marginTop: 12 },
});
