import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, Platform } from 'react-native';
import { useOpenDome, OpenDomeLockScreen } from 'opendome';
import { MINI_APP_THEMES, GLOBAL_STYLES, isDarkTheme } from './theme';
import { locales } from './core/locales';

// Sub-App Imports
import GameView from './components/GameView';
import MapView from './components/MapView';
import WalletView from './components/WalletView';
import EventsView from './components/EventsView';
import UserView from './components/UserView';
import AgentView from './components/AgentView';

const MINI_APPS = [
  { id: 'GAME', title: 'ARCADE' },
  { id: 'MAP', title: 'LOCATION' },
  { id: 'WALLET', title: 'WALLET' },
  { id: 'USER', title: 'USER' },
  { id: 'AGENT', title: 'AGENT' },
  { id: 'EVENTS', title: 'EVENTS' },
];

export default function App() {
  const { isAuthorized, isLocked, token, user, context, loading, proxiedLocation, register, login } = useOpenDome({
    blockchain: { evm: ['base', 'arbitrum', 'avalanche', 'mainnet', 'polygon', 'optimism', 'monad'] }
  });
  
  // Dynamic Context Resolution
  const lang = context?.lang || 'en';
  const t = locales[lang] || locales.en;
  
  const themeType = (context?.theme || 'light').toLowerCase();
  const isDark = isDarkTheme(themeType);
  const tokens = MINI_APP_THEMES[themeType] || MINI_APP_THEMES.dark;

  const [activeApp, setActiveApp] = useState('GAME');
  const [scores, setScores] = useState({ P1: 0, AI: 0 });
  const scrollRef = useRef(null);

  useEffect(() => {
    if (loading) return;
    if (Platform.OS !== 'web') return;

    const handleWheel = (e) => {
      if (scrollRef.current) {
        const node = scrollRef.current.getScrollableNode ? scrollRef.current.getScrollableNode() : scrollRef.current;
        if (node) {
          // Horizontal scrolling for the tab selector
          node.scrollLeft += e.deltaY;
        }
      }
    };

    const node = scrollRef.current && (scrollRef.current.getScrollableNode ? scrollRef.current.getScrollableNode() : scrollRef.current);
    if (node && typeof node.addEventListener === 'function') {
      node.addEventListener('wheel', handleWheel, { passive: true });
      return () => {
        node.removeEventListener('wheel', handleWheel);
      };
    }
  }, [loading]);

  useEffect(() => {
    if (scrollRef.current) {
      const activeIndex = MINI_APPS.findIndex(app => app.id === activeApp);
      if (activeIndex !== -1) {
        const tabWidth = 96; // Matches the minWidth of the tab
        // Center the active tab in the visible viewport (assuming screen width is ~380px)
        const targetX = Math.max(0, (activeIndex * tabWidth) - 120);
        scrollRef.current.scrollTo({ x: targetX, animated: true });
      }
    }
  }, [activeApp]);

  const navigateApp = (direction) => {
    const currentIndex = MINI_APPS.findIndex(app => app.id === activeApp);
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % MINI_APPS.length;
    } else {
      nextIndex = (currentIndex - 1 + MINI_APPS.length) % MINI_APPS.length;
    }
    setActiveApp(MINI_APPS[nextIndex].id);
  };

  if (loading) return (
    <View style={[styles.loadingContainer, { backgroundColor: tokens.BG }]}>
      <Text style={[styles.loadingText, { color: tokens.NEON_PRIMARY, textShadowColor: isDark ? tokens.NEON_PRIMARY : 'transparent', textShadowRadius: 10 }]}>
        {t.init}
      </Text>
      <Text style={[styles.loadingSubText, { color: tokens.MUTED }]}>{t.connecting}</Text>
    </View>
  );

  if (isLocked) {
    return <OpenDomeLockScreen />;
  }

  const renderActiveApp = () => {
    const props = {
      isAuthorized,
      username: user?.username || t.game?.guest || 'Guest',
      theme: themeType,
      tokens,
      scores,
      setScores,
      t // Inject translation dictionary
    };
    switch (activeApp) {
      case 'GAME': return <GameView {...props} />;
      case 'MAP': return <MapView {...props} proxiedLocation={proxiedLocation} />;
      case 'WALLET': return <WalletView {...props} />;
      case 'USER': return <UserView {...props} />;
      case 'AGENT': return <AgentView {...props} />;
      case 'EVENTS': return <EventsView {...props} />;
      default: return <UserView {...props} />;
    }
  };


  return (
    <View style={[styles.container, { backgroundColor: tokens.BG }]}>
      {/* Cyberpunk Header Selector */}
      <View style={[styles.header, { backgroundColor: tokens.SURFACE, borderBottomColor: tokens.BORDER }]}>
        <View style={styles.brandRow}>
          <View style={styles.brand}>
            <Text style={[styles.brandTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>{t.brand}</Text>
            <Text style={[styles.brandSubtitle, { color: tokens.NEON_PRIMARY, fontFamily: tokens.font.mono }]}>{t.demo}</Text>
          </View>

          <View style={styles.navArrows}>
            <TouchableOpacity onPress={() => navigateApp('prev')} style={[styles.arrowButton, { borderColor: tokens.BORDER, backgroundColor: tokens.BG, borderRadius: tokens.shape.buttonRadius, borderWidth: tokens.shape.border }]}>
              <Text style={[styles.arrowText, { color: tokens.FG, fontFamily: tokens.font.primary }]}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigateApp('next')} style={[styles.arrowButton, { borderColor: tokens.BORDER, backgroundColor: tokens.BG, borderRadius: tokens.shape.buttonRadius, borderWidth: tokens.shape.border }]}>
              <Text style={[styles.arrowText, { color: tokens.FG, fontFamily: tokens.font.primary }]}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.selectorContainer}>
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navGrid}
          >
            {MINI_APPS.map((app) => {
              const isActive = activeApp === app.id;
              
              // Only apply the glow directly to the text, NOT the container
              const textGlow = isActive && isDark ? {
                textShadowColor: tokens.NEON_PRIMARY,
                textShadowRadius: 12,
                textShadowOffset: { width: 0, height: 0 }
              } : {};

              return (
                <TouchableOpacity
                  key={app.id}
                  activeOpacity={0.7}
                  style={[
                    styles.tab,
                    {
                      borderColor: tokens.BORDER,
                      backgroundColor: tokens.BG,
                      borderBottomWidth: isActive ? 3 : tokens.shape.border,
                      borderBottomColor: isActive ? tokens.NEON_PRIMARY : tokens.BORDER,
                      borderTopLeftRadius: tokens.shape.cardRadius > 0 ? tokens.shape.cardRadius / 2 : 0,
                      borderTopRightRadius: tokens.shape.cardRadius > 0 ? tokens.shape.cardRadius / 2 : 0,
                      shadowOpacity: 0,
                      elevation: 0, 
                    }
                  ]}
                  onPress={() => setActiveApp(app.id)}
                >
                  <Text 
                    style={[
                      styles.tabText, 
                      { color: isActive ? tokens.NEON_PRIMARY : tokens.MUTED, fontFamily: tokens.font.primary },
                      textGlow 
                    ]}
                  >
                    {t.apps[app.id] || app.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Main Stage */}
      <View style={styles.stage}>
        {renderActiveApp()}
      </View>

      {/* Footer Status */}
      <View style={[styles.footer, { backgroundColor: tokens.SURFACE, borderTopColor: tokens.BORDER }]}>
        <View style={styles.statusGroup}>
          <View style={[
            styles.dot,
            { backgroundColor: isAuthorized ? tokens.NEON_SUCCESS : tokens.NEON_PRIMARY, borderRadius: tokens.shape.pillRadius },
            isDark && { shadowColor: isAuthorized ? tokens.NEON_SUCCESS : tokens.NEON_PRIMARY, shadowOpacity: 0.8, shadowRadius: 8 }
          ]} />
          <Text style={[styles.statusText, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
            {isAuthorized ? t.secure : t.disconnected}
          </Text>
        </View>
        <Text style={[styles.tokenText, { color: tokens.MUTED, fontFamily: tokens.font.mono }]}>ID_{token?.substring(0, 12).toUpperCase()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 10, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: 1, marginBottom: 8, fontFamily: GLOBAL_STYLES.monospace },
  loadingSubText: { fontSize: 8, fontWeight: 'bold', letterSpacing: 1, fontFamily: GLOBAL_STYLES.monospace },

  header: {
    paddingTop: 12,
    borderBottomWidth: 2,
  },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  brandTitle: { fontSize: 18, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: -1 },
  brandSubtitle: { fontSize: 8, fontWeight: 'bold', letterSpacing: 2 },

  navArrows: { flexDirection: 'row', gap: 4 },
  arrowButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  arrowText: { fontSize: 14, fontWeight: 'bold' },

  selectorContainer: { paddingHorizontal: 20, paddingBottom: 0 },
  navGrid: { flexDirection: 'row' },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1, // Will be overridden
    marginBottom: -1, 
    marginRight: -1,
  },
  tabText: { fontSize: 10, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: 1 },

  stage: { flex: 1 },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 2,
  },
  statusGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 6, height: 6 },
  statusText: { fontSize: 8, fontWeight: 'bold' },
  tokenText: { fontSize: 8 }
});