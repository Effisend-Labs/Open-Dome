import React, { useEffect, useState } from 'react';
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

function AdminGate({ appId, appToken }) {
  const { isAuthorized, isLocked, token, user, loading } = useOpenDome({
    appId,
    appToken,
    blockchain: false,
  });

  // Keep module JWT in sync immediately (before child fetches)
  if (token) {
    setHostJwt(token);
  }

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

  // Same rule as OpenStore: @altaga only (role claim may be missing/legacy "user")
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

export default function Home() {
  const [dock, setDock] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/docking-token');
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error || `docking-token failed (${res.status})`);
        }
        if (!body.token) {
          throw new Error('docking-token response missing token');
        }
        if (!cancelled) setDock(body);
      } catch (e) {
        if (!cancelled) setError(e.message || String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <View style={s.center}>
        <Text style={s.title}>Config error</Text>
        <Text style={s.muted}>{error}</Text>
      </View>
    );
  }

  if (!dock) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return <AdminGate appId={dock.appId} appToken={dock.token} />;
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
