import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useOpenDome, OpenDomeLockScreen } from 'opendome';
import { Ionicons } from '@expo/vector-icons';
import { GEMINI_CHAT_MODELS } from 'opendome/src/agentTariff.js';
import { MINI_APP_THEMES } from './theme';
import { ChatView } from './features/chat/ChatView';
import { AccountView } from './features/account/AccountView';
import { ModelPicker } from './features/chat/ModelPicker';
import { AppHeader } from './features/shell/AppHeader';
import { useKeyboardInset } from './features/shell/useKeyboardInset';
import { CreditsBadge } from './features/credits/CreditsBadge';
import { useUsdcCredits } from './features/credits/useUsdcCredits';
import { openBaseScan, usdcExplorerUrl } from './features/explorer/baseScan';

export default function App() {
  const { isAuthorized, isLocked, user, context, loading, register, login, logout, authPending, authError } = useOpenDome({
    blockchain: { evm: ['base', 'arbitrum', 'avalanche', 'mainnet', 'polygon', 'optimism', 'monad'] },
  });

  const themeType = (context?.theme || 'dark').toLowerCase();
  const isDark = !['light', 'pastel', 'alpine'].includes(themeType);
  const tokens = MINI_APP_THEMES[themeType] || MINI_APP_THEMES.dark;
  const keyboardInset = useKeyboardInset();
  const [screen, setScreen] = useState('CHAT');
  const [modelId, setModelId] = useState(GEMINI_CHAT_MODELS[1].id);
  const credits = useUsdcCredits();

  if (loading) {
    return (
      <View style={[styles.boot, { backgroundColor: tokens.BG }]}>
        <Text style={{ color: tokens.MUTED, fontSize: 15 }}>Connecting</Text>
      </View>
    );
  }

  if (isLocked) return <OpenDomeLockScreen />;

  return (
    <View style={[styles.root, { backgroundColor: tokens.BG, paddingBottom: keyboardInset }]}>
      <AppHeader
        tokens={tokens}
        left={
          screen === 'ACCOUNT' ? (
            <Pressable onPress={() => setScreen('CHAT')} hitSlop={12} style={styles.back}>
              <Ionicons name="chevron-back" size={22} color={tokens.FG} />
            </Pressable>
          ) : isAuthorized ? (
            <ModelPicker tokens={tokens} modelId={modelId} onChange={setModelId} />
          ) : null
        }
        right={
          screen === 'CHAT' && isAuthorized ? (
            <View style={styles.right}>
              <CreditsBadge
                tokens={tokens}
                label={`${credits.label} USDC`}
                status={credits.status}
                onPress={() => openBaseScan(usdcExplorerUrl(user?.evmAddress))}
              />
              <Pressable onPress={() => setScreen('ACCOUNT')} hitSlop={10} style={styles.account}>
                <Ionicons name="person-circle-outline" size={28} color={tokens.FG_SECONDARY} />
              </Pressable>
            </View>
          ) : null
        }
      />

      {screen === 'CHAT' ? (
        <ChatView
          tokens={tokens}
          isDark={isDark}
          isAuthorized={isAuthorized}
          onGoToAccount={() => setScreen('ACCOUNT')}
          credits={credits}
          modelId={modelId}
          onChangeModel={setModelId}
          login={login}
          authPending={authPending}
          authError={authError}
        />
      ) : (
        <AccountView
          tokens={tokens}
          isAuthorized={isAuthorized}
          user={user}
          register={register}
          login={login}
          logout={logout}
          credits={credits}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  boot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  back: { width: 36, height: 36, justifyContent: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  account: { width: 36, height: 36, alignItems: 'flex-end', justifyContent: 'center' },
});
