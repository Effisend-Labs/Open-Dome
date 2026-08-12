import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useOpenDome, OpenDomeLockScreen } from 'opendome';
import ScannerDashboard from '../components/ScannerDashboard';
import { isStaffUser, getStaffRoleFromUser, normalizeUsername } from '../core/staffAccess';

const COLORS = {
  bg: '#09090b',
  fg: '#fafafa',
  muted: '#a1a1aa',
  primary: '#2563eb',
};

function ScannerGate({ appId, appToken }) {
  const { isAuthorized, isLocked, token, user, loading } = useOpenDome({
    appId,
    appToken,
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
        <Text style={s.title}>Scanner locked</Text>
        <Text style={s.muted}>
          Sign in to OpenDome as scanner, admin, or @altaga, then open this app from the host.
        </Text>
      </View>
    );
  }

  if (!isStaffUser(user, token)) {
    return (
      <View style={s.center}>
        <Text style={s.title}>Access denied</Text>
        <Text style={s.muted}>
          Scanner is only available to SCANNER, ADMIN, and GOD (@altaga).
        </Text>
      </View>
    );
  }

  const role = getStaffRoleFromUser(user, token);

  return (
    <ScannerDashboard
      hostToken={token}
      currentUser={{
        name: `@${normalizeUsername(user.username)}`,
        role,
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
        if (!res.ok) throw new Error(body.error || `docking-token failed (${res.status})`);
        if (!body.token) throw new Error('docking-token response missing token');
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

  return <ScannerGate appId={dock.appId} appToken={dock.token} />;
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
