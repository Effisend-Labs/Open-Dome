import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useOpenDome, OpenDomeLockScreen } from 'opendome';
import { Ionicons } from '@expo/vector-icons';
import { MINI_APP_THEMES } from './theme';
import { ChatView } from './features/chat/ChatView';
import { AccountView } from './features/account/AccountView';

const TABS = [
  { id: 'CHAT', label: 'Agent', icon: 'sparkles-outline' },
  { id: 'ACCOUNT', label: 'Account', icon: 'person-outline' },
];

export default function App({ appId, appToken }) {
  const { isAuthorized, isLocked, user, context, loading, register, login, logout } = useOpenDome({
    appId: appId || process.env.EXPO_PUBLIC_OD_APP_ID,
    appToken,
    blockchain: { evm: ['base', 'arbitrum', 'avalanche', 'mainnet', 'polygon', 'optimism', 'monad'] },
  });

  const themeType = (context?.theme || 'dark').toLowerCase();
  const isDark = !['light', 'pastel', 'alpine'].includes(themeType);
  const tokens = MINI_APP_THEMES[themeType] || MINI_APP_THEMES.dark;
  const [activeTab, setActiveTab] = useState('CHAT');

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: tokens.BG }]}>
        <Text style={{ color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }}>Connecting</Text>
      </View>
    );
  }

  if (isLocked) return <OpenDomeLockScreen />;

  const userInitial = user?.username ? user.username[0].toUpperCase() : '·';

  return (
    <View style={[styles.container, { backgroundColor: tokens.BG }]}>
      <View style={[styles.topBar, { borderBottomColor: tokens.BORDER }]}>
        <Text style={[styles.appName, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
          OpenAgent
        </Text>
        <View style={[styles.avatar, { backgroundColor: tokens.ACCENT_SOFT }]}>
          <Text style={[styles.avatarText, { color: tokens.ACCENT }]}>
            {isAuthorized ? userInitial : '·'}
          </Text>
        </View>
      </View>

      <View style={[styles.tabBar, { borderBottomColor: tokens.BORDER }]}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons name={tab.icon} size={20} color={active ? tokens.FG : tokens.MUTED} />
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? tokens.FG : tokens.MUTED, fontFamily: tokens.font.primary },
                ]}
              >
                {tab.label}
              </Text>
              {active ? <View style={[styles.underline, { backgroundColor: tokens.FG }]} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.content}>
        {activeTab === 'CHAT' ? (
          <ChatView
            tokens={tokens}
            isDark={isDark}
            isAuthorized={isAuthorized}
            onGoToAccount={() => setActiveTab('ACCOUNT')}
          />
        ) : (
          <AccountView
            tokens={tokens}
            isAuthorized={isAuthorized}
            user={user}
            register={register}
            login={login}
            logout={logout}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 16 : 52,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  appName: { fontSize: 20, fontWeight: '600', letterSpacing: -0.5 },
  avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 13, fontWeight: '600' },
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingTop: 12, paddingBottom: 12, gap: 4 },
  tabLabel: { fontSize: 11, fontWeight: '500' },
  underline: { position: 'absolute', bottom: 0, height: 2, width: 48, borderRadius: 1 },
  content: { flex: 1 },
});
