import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { useOpenDome } from 'opendome';
import { copyText } from '../features/receive/copyText';
import imgBase from '../assets/base.png';
import imgSol from '../assets/sol.png';

function truncateAddress(addr) {
  if (!addr) return '';
  if (addr.length < 14) return addr;
  return `${addr.slice(0, 6)}···${addr.slice(-4)}`;
}

function AddressRow({ label, subtitle, value, icon, tokens, copied, onCopy }) {
  if (!value) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.65}
      onPress={onCopy}
      style={[styles.addressRow, { borderBottomColor: tokens.BORDER }]}
    >
      <View
        style={[
          styles.chainIcon,
          { backgroundColor: tokens.SURFACE_ELEVATED, borderColor: tokens.BORDER },
        ]}
      >
        <Image source={icon} style={{ width: 22, height: 22 }} resizeMode="contain" />
      </View>

      <View style={styles.addressInfo}>
        <Text style={[styles.addressLabel, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
          {label}
        </Text>
        <Text style={[styles.addressSub, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.addressMeta}>
        <Text style={[styles.addressValue, { color: tokens.FG, fontFamily: tokens.font.mono }]}>
          {truncateAddress(value)}
        </Text>
        <Text style={[styles.copyHint, { color: copied ? tokens.SUCCESS : tokens.MUTED, fontFamily: tokens.font.primary }]}>
          {copied ? 'Copied' : 'Tap to copy'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function UserView({ tokens, t }) {
  const { isAuthorized, user, register, login, logout } = useOpenDome();
  const [username, setUsername] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

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

  const handleCopy = async (key, address) => {
    if (!address) return;
    try {
      await copyText(address);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setCopiedKey(null);
    }
  };

  if (isAuthorized && user) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: tokens.BG }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: tokens.SUCCESS }]} />
            <Text style={[styles.statusText, { color: tokens.SUCCESS, fontFamily: tokens.font.primary }]}>
              {t.userProfile?.sessionActive || 'Session active'}
            </Text>
          </View>

          <Text style={[styles.handle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
            @{user.username || 'unknown'}
          </Text>
          <Text style={[styles.headerSub, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
            {t.userProfile?.securePassport || 'Secure Passport'}
          </Text>
        </View>

        <View style={[styles.listSection, { backgroundColor: tokens.SURFACE }]}>
          <View style={[styles.listHeader, { borderBottomColor: tokens.BORDER }]}>
            <Text style={[styles.listTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
              Addresses
            </Text>
            <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: tokens.font.mono }}>
              EVM · SOL
            </Text>
          </View>

          <AddressRow
            label="EVM"
            subtitle="Shared across Base and L2s"
            value={user.evmAddress}
            icon={imgBase}
            tokens={tokens}
            copied={copiedKey === 'evm'}
            onCopy={() => handleCopy('evm', user.evmAddress)}
          />
          <AddressRow
            label="Solana"
            subtitle="Circle Solana wallet"
            value={user.solanaAddress}
            icon={imgSol}
            tokens={tokens}
            copied={copiedKey === 'sol'}
            onCopy={() => handleCopy('sol', user.solanaAddress)}
          />
        </View>

        <View style={styles.actionWrap}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLogout}
            style={[
              styles.actionPill,
              {
                backgroundColor: tokens.SURFACE_ELEVATED,
                borderColor: tokens.BORDER,
              },
            ]}
          >
            <Text style={[styles.actionLabel, { color: tokens.DANGER, fontFamily: tokens.font.primary }]}>
              {t.userProfile?.disconnect || 'Disconnect'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.BG }}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
          Account
        </Text>
        <Text style={[styles.handle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
          {t.userProfile?.securePassport || 'Secure Passport'}
        </Text>
        <Text style={[styles.headerSub, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
          {t.userProfile?.bioAuthMsg || 'Biometric auth is securely handled by the sandbox.'}
        </Text>
      </View>

      <View style={[styles.listSection, { backgroundColor: tokens.SURFACE }]}>
        <View style={[styles.listHeader, { borderBottomColor: tokens.BORDER }]}>
          <Text style={[styles.listTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
            {t.userProfile?.createAccount || 'Create account'}
          </Text>
        </View>

        <View style={styles.registerBody}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: tokens.BG,
                borderColor: tokens.BORDER,
                color: tokens.FG,
                fontFamily: tokens.font.mono,
              },
            ]}
            value={username}
            onChangeText={setUsername}
            placeholder={t.userProfile?.usernamePlaceholder || 'username (e.g. alice)'}
            placeholderTextColor={tokens.MUTED}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!pending}
          />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleRegister}
            disabled={pending}
            style={[styles.actionPill, { backgroundColor: tokens.ACCENT, borderColor: tokens.ACCENT }]}
          >
            {pending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={[styles.actionLabel, { color: '#FFFFFF', fontFamily: tokens.font.primary }]}>
                {t.userProfile?.registerBtn || 'Register with Passkey'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.orRow}>
        <View style={[styles.orLine, { backgroundColor: tokens.BORDER }]} />
        <Text style={[styles.orText, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
          {t.userProfile?.or || 'or'}
        </Text>
        <View style={[styles.orLine, { backgroundColor: tokens.BORDER }]} />
      </View>

      <View style={styles.actionWrap}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleLogin}
          disabled={pending}
          style={[
            styles.actionPill,
            {
              backgroundColor: tokens.SURFACE_ELEVATED,
              borderColor: tokens.BORDER,
            },
          ]}
        >
          {pending ? (
            <ActivityIndicator color={tokens.FG} size="small" />
          ) : (
            <Text style={[styles.actionLabel, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
              {t.userProfile?.signInBtn || 'Sign in with Passkey'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {error ? (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor: tokens.DANGER_SOFT || 'rgba(220, 38, 38, 0.06)',
              borderColor: tokens.DANGER,
            },
          ]}
        >
          <Text style={[styles.errorText, { color: tokens.DANGER, fontFamily: tokens.font.mono }]}>
            {error}
          </Text>
        </View>
      ) : null}

      {pending ? (
        <Text style={[styles.hint, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
          {t.userProfile?.awaitingBio || 'Awaiting biometric verification...'}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  handle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.9,
  },
  headerSub: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    letterSpacing: -0.1,
  },
  listSection: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  chainIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressInfo: {
    flex: 1,
    gap: 2,
  },
  addressLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  addressSub: {
    fontSize: 12,
    letterSpacing: -0.1,
  },
  addressMeta: {
    alignItems: 'flex-end',
    gap: 2,
  },
  addressValue: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  copyHint: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  actionWrap: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  actionPill: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  registerBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    gap: 10,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  orText: {
    fontSize: 11,
    fontWeight: '500',
  },
  errorBox: {
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '500',
  },
  hint: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
  },
});
