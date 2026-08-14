import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useOpenDome, OpenDomeLockScreen } from 'opendome';
import Dashboard from '../components/Dashboard';

const COLORS = {
  bg: '#09090b',
  fg: '#fafafa',
  muted: '#a1a1aa',
  primary: '#2563eb',
};

function normalizeUsername(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/^@/, '');
}

/**
 * Thin UI shell — no JWT/role verification here.
 * Host dock + OpenDomeApp APIs enforce god permission; failures surface in UI.
 */
export default function Home() {
  const { isAuthorized, isLocked, token, user, loading } = useOpenDome({
    blockchain: false,
  });

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={COLORS.primary} />
        <Text style={s.muted}>Connecting to OpenDome…</Text>
      </View>
    );
  }

  if (isLocked) {
    return <OpenDomeLockScreen />;
  }

  if (!isAuthorized || !token || !user) {
    return (
      <View style={s.center}>
        <Text style={s.title}>Admin locked</Text>
        <Text style={s.muted}>
          Open this mini-app from OpenDome after signing in. Permission is checked on the host.
        </Text>
      </View>
    );
  }

  return (
    <Dashboard
      currentUser={{
        name: user.username
          ? `@${normalizeUsername(user.username)}`
          : 'OpenDome user',
        role: String(user.role || 'user').toUpperCase(),
        evmAddress: user.evmAddress,
      }}
    />
  );
}

const s = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  title: { color: COLORS.fg, fontSize: 20, fontWeight: '700' },
  muted: { color: COLORS.muted, fontSize: 14, textAlign: 'center', maxWidth: 320 },
});
