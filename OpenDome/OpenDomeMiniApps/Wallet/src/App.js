import React, { useState, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, Animated, ScrollView, Dimensions } from 'react-native';
import { useOpenDome, OpenDomeLockScreen } from 'opendome';
import { MINI_APP_THEMES, GLOBAL_STYLES } from './theme';
import { locales } from './core/locales';
import { USE_NATIVE_DRIVER } from './utils/styleCompat';

import WalletView from './components/WalletView';
import PassesView from './components/PassesView';
import AgentView from './components/AgentView';
import UserView from './components/UserView';
import { AgentConversationProvider } from './features/agent/AgentConversationContext';
import { useKeyboardInset } from './features/shell/useKeyboardInset';
import { Ionicons } from '@expo/vector-icons';

const TABS = [
  { id: 'WALLET', label: 'Portfolio', icon: 'pie-chart-outline' },
  { id: 'PASSES', label: 'NFTs', icon: 'images-outline' },
  { id: 'AGENT', label: 'Agent', icon: 'sparkles-outline' },
  { id: 'USER', label: 'Account', icon: 'person-outline' },
];

const TAB_INDEX = { WALLET: 0, PASSES: 1, AGENT: 2, USER: 3 };

export default function App() {
  const { isAuthorized, isLocked, token, user, context, loading, register, login } = useOpenDome({
    blockchain: { evm: ['base', 'arbitrum', 'avalanche', 'mainnet', 'polygon', 'optimism', 'monad'] }
  });

  const lang = context?.lang || 'en';
  const t = locales[lang] || locales.en;

  const themeType = (context?.theme || 'dark').toLowerCase();
  const isDark = !['light', 'pastel', 'alpine'].includes(themeType);
  const tokens = MINI_APP_THEMES[themeType] || MINI_APP_THEMES.dark;

  const keyboardInset = useKeyboardInset();
  const [activeTab, setActiveTab] = useState('WALLET');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const underlineX = useRef(new Animated.Value(0)).current;
  const underlineWidth = useRef(new Animated.Value(48)).current;
  const tabWidths = useRef({});
  const tabPositions = useRef({});

  const switchTab = useCallback((tabId) => {
    const currentIdx = TAB_INDEX[activeTab];
    const nextIdx = TAB_INDEX[tabId];
    const direction = nextIdx > currentIdx ? -1 : 1;

    // Slide out current content
    Animated.timing(slideAnim, {
      toValue: direction * 40,
      duration: 120,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(() => {
      setActiveTab(tabId);
      // Reset to opposite side and slide in
      slideAnim.setValue(-direction * 40);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    });

    // Animate underline to new tab position
    const targetX = tabPositions.current[tabId] || 0;
    const targetWidth = tabWidths.current[tabId] || 48;
    
    Animated.parallel([
      Animated.spring(underlineX, {
        toValue: targetX,
        friction: 20,
        tension: 300,
        useNativeDriver: false,
      }),
      Animated.spring(underlineWidth, {
        toValue: targetWidth,
        friction: 20,
        tension: 300,
        useNativeDriver: false,
      })
    ]).start();
  }, [activeTab, slideAnim, underlineX, underlineWidth]);

  const handleTabLayout = useCallback((tabId, event) => {
    const { x, width } = event.nativeEvent.layout;
    tabPositions.current[tabId] = x;
    tabWidths.current[tabId] = width;
    // Initialize underline on first layout of the active tab
    if (tabId === activeTab) {
      underlineX.setValue(x);
      underlineWidth.setValue(width);
    }
  }, [activeTab, underlineX, underlineWidth]);

  if (loading) return (
    <View style={[styles.loadingContainer, { backgroundColor: tokens.BG }]}>
      <View style={styles.loadingDot}>
        <View style={[styles.pulseCore, { backgroundColor: tokens.ACCENT }]} />
      </View>
      <Text style={[styles.loadingText, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
        Connecting
      </Text>
    </View>
  );

  if (isLocked) {
    return <OpenDomeLockScreen />;
  }

  const renderContent = () => {
    const props = {
      isAuthorized,
      theme: themeType,
      tokens,
      t,
      isDark,
      user,
      register,
      login,
      username: user?.username || 'Guest',
      onGoToAccount: () => switchTab('USER'),
    };
    switch (activeTab) {
      case 'WALLET': return <WalletView {...props} />;
      case 'PASSES': return <PassesView {...props} />;
      case 'AGENT': return <AgentView {...props} />;
      case 'USER': return <UserView {...props} />;
      default: return <WalletView {...props} />;
    }
  };

  const userInitial = user?.username ? user.username[0].toUpperCase() : '?';
  const activeTabWidth = tabWidths.current[activeTab] || 48;

  return (
    <AgentConversationProvider>
    <View style={[styles.container, { backgroundColor: tokens.BG, paddingBottom: keyboardInset }]}>
      {/* Minimal Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: tokens.BORDER }]}>
        <Text style={[styles.appName, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
          Wallet
        </Text>
        <View style={[styles.avatar, { backgroundColor: tokens.ACCENT_SOFT }]}>
          <Text style={[styles.avatarText, { color: tokens.ACCENT, fontFamily: tokens.font.primary }]}>
            {isAuthorized ? userInitial : '·'}
          </Text>
        </View>
      </View>

      {/* Tab Bar with Animated Underline */}
      <View style={[styles.tabBar, { backgroundColor: tokens.BG }]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.7}
              style={styles.tab}
              onPress={() => switchTab(tab.id)}
              onLayout={(e) => handleTabLayout(tab.id, e)}
            >
              <Ionicons 
                name={tab.icon} 
                size={22} 
                color={isActive ? tokens.FG : tokens.MUTED} 
                style={{ marginBottom: 4 }}
              />
              <Text style={[
                styles.tabLabel,
                { color: isActive ? tokens.FG : tokens.MUTED, fontFamily: tokens.font.primary }
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        {/* Animated Underline */}
        <Animated.View
          style={[
            styles.tabUnderline,
            {
              backgroundColor: tokens.FG,
              width: underlineWidth,
              transform: [{ translateX: underlineX }],
            }
          ]}
        />
      </View>

      {/* Content with Directional Slide */}
      <Animated.View style={[styles.content, { transform: [{ translateX: slideAnim }], opacity: slideAnim.interpolate({ inputRange: [-40, 0, 40], outputRange: [0.6, 1, 0.6] }) }]}>
        {renderContent()}
      </Animated.View>
    </View>
    </AgentConversationProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0 },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingDot: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  loadingText: {
    fontSize: 13,
    letterSpacing: 0.5,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 16 : 52,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  appName: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '600',
  },

  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 16,
    position: 'relative',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    paddingBottom: 12,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0, 
    height: 2,
    borderRadius: 1,
  },

  content: { flex: 1 },
});