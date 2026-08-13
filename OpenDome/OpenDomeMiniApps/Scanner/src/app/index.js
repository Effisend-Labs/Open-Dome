import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useOpenDome, OpenDomeLockScreen } from 'opendome';
import ScannerDashboard from '../components/ScannerDashboard';
import { isStaffUser, getStaffRoleFromUser, normalizeUsername } from '../core/staffAccess';

const COLORS = {
  bg: '#0A0A0A',
  fg: '#F5F5F5',
  muted: '#737373',
  primary: '#0052FF',
};

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
