import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { SignInForm } from '../auth/SignInForm';

function truncateAddress(addr) {
  if (!addr || addr.length < 12) return addr || '';
  return `${addr.slice(0, 6)}···${addr.slice(-4)}`;
}

export function AccountView({ tokens, isAuthorized, user, register, login, logout, credits }) {
  if (isAuthorized && user) {
    return (
      <View style={[styles.screen, { backgroundColor: tokens.BG }]}>
        <Text style={[styles.amount, { color: tokens.FG }]}>
          {credits?.status === 'loading' ? '…' : credits?.unifiedLabel ?? '—'}
        </Text>
        <Text style={[styles.caption, { color: tokens.MUTED }]}>
          USDC across supported networks
        </Text>
        <Text style={[styles.handle, { color: tokens.FG_SECONDARY }]}>
          @{user.username || 'unknown'}
        </Text>
        {user.evmAddress ? (
          <Text style={[styles.addr, { color: tokens.MUTED }]}>
            {truncateAddress(user.evmAddress)}
          </Text>
        ) : null}
        <Pressable onPress={logout} style={styles.out}>
          <Text style={[styles.outText, { color: tokens.DANGER }]}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.BG }}
      contentContainerStyle={styles.auth}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.authTitle, { color: tokens.FG }]}>Sign in</Text>
      <Text style={[styles.authBody, { color: tokens.MUTED }]}>
        Pay per prompt in USDC. You confirm each send.
      </Text>
      <SignInForm tokens={tokens} register={register} login={login} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  amount: { fontSize: 56, fontWeight: '500', letterSpacing: -2, lineHeight: 64 },
  caption: { fontSize: 16, marginTop: 4, marginBottom: 28 },
  handle: { fontSize: 17, fontWeight: '500' },
  addr: { fontSize: 14, marginTop: 6 },
  out: { marginTop: 28 },
  outText: { fontSize: 16 },
  auth: { paddingHorizontal: 20, paddingTop: 8 },
  authTitle: { fontSize: 22, fontWeight: '500', marginBottom: 6 },
  authBody: { fontSize: 15, lineHeight: 21, marginBottom: 20 },
});
