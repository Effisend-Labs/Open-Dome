import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useOpenDome, OpenDomeLockScreen } from 'opendome';
import Dashboard from '../components/Dashboard';
import { setHostJwt } from '../core/adminApi';

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

function isAltaga(user) {
  return normalizeUsername(user?.username) === 'altaga';
}

export default function Home() {
  const { isAuthorized, isLocked, token, user, loading } = useOpenDome({
    blockchain: false,
  });

  if (token) setHostJwt(token);

  useEffect(() => {
    setHostJwt(token || null);
  }, [token]);

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
          Sign in to OpenDome as @altaga, then open this mini-app from the host.
        </Text>
      </View>
    );
  }

  if (!isAltaga(user)) {
    return (
      <View style={s.center}>
        <Text style={s.title}>Access denied</Text>
        <Text style={s.muted}>
          This mini-app is only available to @altaga (god).
        </Text>
      </View>
    );
  }

  return (
    <Dashboard
      hostToken={token}
      currentUser={{
        name: `@${normalizeUsername(user.username)}`,
        role: 'GOD',
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
