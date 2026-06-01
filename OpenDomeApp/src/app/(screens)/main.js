import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView,
  Animated, Platform, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PasskeyAuth from '../../components/PasskeyAuth';
import TransactionModal from '../../components/TransactionModal';
import IframeContainer from '../../components/IframeContainer';

const W = Dimensions.get('window').width;
const TOKYO_COORDS = { latitude: 35.70564, longitude: 139.75191 };

const APPS = [
  {
    id: 'tdc',
    name: 'TDC Events',
    subtitle: 'Tokyo Dome City schedule',
    gradient: ['#1A1A2E', '#16213E'],
    accent: '#4A90E2',
    symbol: '🏟',
    url: 'http://localhost:8081',
  },
  {
    id: 'wallet',
    name: 'Dome Wallet',
    subtitle: 'EVM & Solana assets',
    gradient: ['#0D1B2A', '#1B2A3B'],
    accent: '#30D158',
    symbol: '◈',
    url: 'http://localhost:8082',
  },
  {
    id: 'comms',
    name: 'Notice Board',
    subtitle: 'Ecosystem messages',
    gradient: ['#1C1A2E', '#261A3E'],
    accent: '#BF5AF2',
    symbol: '⬡',
    url: 'http://localhost:8083',
  },
  {
    id: 'map',
    name: 'Venue Map',
    subtitle: 'Interactive location guide',
    gradient: ['#1A2E1E', '#1A3B22'],
    accent: '#FFD60A',
    symbol: '◎',
    url: 'http://localhost:8084',
  },
  {
    id: 'tickets',
    name: 'My Tickets',
    subtitle: 'Manage event passes',
    gradient: ['#2E1A1A', '#3B1A1A'],
    accent: '#FF6B6B',
    symbol: '▣',
    url: 'http://localhost:8085',
  },
  {
    id: 'explore',
    name: 'Explore',
    subtitle: 'Discover nearby attractions',
    gradient: ['#1A2A2E', '#1A333B'],
    accent: '#5AC8FA',
    symbol: '✦',
    url: 'http://localhost:8086',
  },
];

const CTX_VARS = [{ key: 'theme', value: 'dark' }, { key: 'lang', value: 'ja' }];

export default function Main() {
  const [activeApp, setActiveApp] = useState(null);
  const [verifiedToken, setVerifiedToken] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [commJwt, setCommJwt] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [pendingIntent, setPendingIntent] = useState(null);
  const [balances] = useState({ evm: '2.4550', solana: '34.20' });

  // Launch animation
  const launchAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('od_session');
        if (token) {
          const res = await verifyServer(token);
          if (res?.authenticated) {
            setVerifiedToken(res.token);
            setUserProfile({ username: res.username, evmAddress: res.evmAddress, solanaAddress: res.solanaAddress });
            setCommJwt(res.wsJwt);
            return;
          }
          await AsyncStorage.removeItem('od_session');
        }
        const guest = await verifyServer(null);
        if (guest?.wsJwt) setCommJwt(guest.wsJwt);
      } catch (e) { /* silent */ }
    })();
  }, []);

  const verifyServer = async (token) => {
    try {
      const r = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!r.ok) return null;
      return r.json();
    } catch { return null; }
  };

  const handleAuthSuccess = async (token) => {
    await AsyncStorage.setItem('od_session', token);
    const res = await verifyServer(token);
    if (res?.authenticated) {
      setVerifiedToken(res.token);
      setUserProfile({ username: res.username, evmAddress: res.evmAddress, solanaAddress: res.solanaAddress });
      setCommJwt(res.wsJwt);
      setShowAuth(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('od_session');
    setVerifiedToken(null);
    setUserProfile(null);
    const guest = await verifyServer(null);
    if (guest?.wsJwt) setCommJwt(guest.wsJwt);
    if (Platform.OS === 'web') {
      document.querySelector('iframe')?.contentWindow?.postMessage({ type: 'OPENDOME_LOGOUT' }, '*');
    }
  };

  const handleAuthFromIframe = ({ token, profile, jwt }) => {
    if (token) {
      AsyncStorage.setItem('od_session', token);
      setVerifiedToken(token); setUserProfile(profile); setCommJwt(jwt);
    } else {
      AsyncStorage.removeItem('od_session');
      setVerifiedToken(null); setUserProfile(null);
    }
  };

  const launchApp = (app) => {
    Animated.parallel([
      Animated.spring(launchAnim, { toValue: 1, tension: 80, friction: 14, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => setActiveApp(app));
  };

  const closeApp = () => {
    setActiveApp(null);
    Animated.parallel([
      Animated.spring(launchAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const approveIntent = () => {
    const i = pendingIntent; if (!i) return;
    setPendingIntent(null);
    if (Platform.OS === 'web') {
      document.querySelector('iframe')?.contentWindow?.postMessage({
        type: 'OPENDOME_INTENT_RESPONSE', status: 'SUCCESS',
        payload: { txHash: `0x${Math.random().toString(16).slice(2, 18)}` }
      }, '*');
    }
  };

  const rejectIntent = () => {
    setPendingIntent(null);
    if (Platform.OS === 'web') {
      document.querySelector('iframe')?.contentWindow?.postMessage({
        type: 'OPENDOME_INTENT_RESPONSE', status: 'REJECTED', error: 'USER_REJECTED'
      }, '*');
    }
  };

  return (
    <SafeAreaView style={s.root}>

      {/* ── TOP MENUBAR ── */}
      <View style={s.menubar}>
        <View style={s.menubarLeft}>
          <View style={s.logoMark}><Text style={s.logoGlyph}>⬡</Text></View>
          <Text style={s.logoLabel}>Open Dome</Text>
        </View>

        <View style={s.menubarRight}>
          {/* Balance pills */}
          <View style={s.pill}>
            <View style={[s.pillDot, { backgroundColor: '#30D158' }]} />
            <Text style={s.pillText}>{balances.evm} <Text style={s.pillUnit}>ETH</Text></Text>
          </View>
          <View style={s.pill}>
            <View style={[s.pillDot, { backgroundColor: '#9945FF' }]} />
            <Text style={s.pillText}>{balances.solana} <Text style={s.pillUnit}>SOL</Text></Text>
          </View>

          {/* Passport button */}
          {userProfile ? (
            <Pressable style={({ pressed }) => [s.passportBtn, pressed && s.pressed]} onPress={handleLogout}>
              <View style={s.passportAvatar}><Text style={s.passportAvatarText}>{userProfile.username[0]?.toUpperCase()}</Text></View>
              <Text style={s.passportName}>@{userProfile.username}</Text>
              <View style={s.onlineDot} />
            </Pressable>
          ) : (
            <Pressable style={({ pressed }) => [s.connectBtn, pressed && s.pressed]} onPress={() => setShowAuth(true)}>
              <Text style={s.connectBtnText}>Connect Passport</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── WORKSPACE ── */}
      <View style={s.workspace}>
        {activeApp ? (
          /* Mini-App Window */
          <View style={s.window}>
            {/* Window chrome */}
            <View style={s.windowChrome}>
              <View style={s.trafficLights}>
                <Pressable style={[s.trafficLight, { backgroundColor: '#FF5F57' }]} onPress={closeApp} />
                <View style={[s.trafficLight, { backgroundColor: '#FFBD2E' }]} />
                <View style={[s.trafficLight, { backgroundColor: '#28C940' }]} />
              </View>
              <View style={s.windowTitle}>
                <Text style={s.windowTitleIcon}>{activeApp.symbol}</Text>
                <Text style={s.windowTitleText}>{activeApp.name}</Text>
                <View style={[s.windowTitleBadge, { backgroundColor: activeApp.accent + '22' }]}>
                  <Text style={[s.windowTitleBadgeText, { color: activeApp.accent }]}>SECURED</Text>
                </View>
              </View>
              <Pressable style={s.windowReload} onPress={() => {
                if (Platform.OS === 'web') {
                  const f = document.querySelector('iframe');
                  if (f) { const src = f.src; f.src = ''; f.src = src; }
                }
              }}>
                <Text style={s.windowReloadText}>↺</Text>
              </Pressable>
            </View>

            {/* Iframe viewport */}
            <View style={s.viewport}>
              <IframeContainer
                activeUrl={activeApp.url}
                verifiedToken={verifiedToken}
                contextVariables={CTX_VARS}
                onUserAuthChanged={handleAuthFromIframe}
                onTransactionIntent={setPendingIntent}
                onAddLog={() => {}}
                gpsLocation={TOKYO_COORDS}
              />
            </View>
          </View>
        ) : (
          /* Springboard */
          <ScrollView
            contentContainerStyle={s.springboard}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero copy */}
            <View style={s.hero}>
              <Text style={s.heroEyebrow}>Tokyo · Ecosystem Hub</Text>
              <Text style={s.heroTitle}>Your Applications</Text>
              <Text style={s.heroSub}>Select an app to open it in the secure workspace.</Text>
            </View>

            {/* App grid */}
            <View style={s.grid}>
              {APPS.map((app, i) => (
                <AppCard key={app.id} app={app} index={i} onPress={() => launchApp(app)} />
              ))}
            </View>

            {/* Footer label */}
            <Text style={s.footerNote}>Secured by Open Dome · Passkey Protected</Text>
          </ScrollView>
        )}
      </View>

      {/* ── PASSPORT AUTH SHEET ── */}
      {showAuth && (
        <View style={s.overlay}>
          <Pressable style={s.overlayBackdrop} onPress={() => setShowAuth(false)} />
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Connect Passport</Text>
            <Text style={s.sheetSub}>
              Authenticate with your passkey to access your wallets and personalized apps.
            </Text>
            <PasskeyAuth onAuthSuccess={handleAuthSuccess} addLog={() => {}} />
          </View>
        </View>
      )}

      {/* ── TRANSACTION MODAL ── */}
      <TransactionModal
        visible={!!pendingIntent}
        intent={pendingIntent}
        onApprove={approveIntent}
        onReject={rejectIntent}
        balances={balances}
      />
    </SafeAreaView>
  );
}

/* ─── App Card Component ─────────────────────────────────────── */
function AppCard({ app, index, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const onPressIn = () => Animated.parallel([
    Animated.spring(scale, { toValue: 0.95, tension: 120, friction: 10, useNativeDriver: true }),
    Animated.timing(glow, { toValue: 1, duration: 150, useNativeDriver: true }),
  ]).start();

  const onPressOut = () => Animated.parallel([
    Animated.spring(scale, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }),
    Animated.timing(glow, { toValue: 0, duration: 200, useNativeDriver: true }),
  ]).start();

  const cardW = Platform.OS === 'web' && W > 900 ? 200 : (W - 64) / 2;

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[s.card, { width: cardW, transform: [{ scale }] }]}>
        {/* Color accent top strip */}
        <View style={[s.cardStrip, { backgroundColor: app.accent }]} />

        {/* Icon */}
        <View style={[s.cardIcon, { borderColor: app.accent + '40' }]}>
          <Text style={[s.cardSymbol, { color: app.accent }]}>{app.symbol}</Text>
        </View>

        {/* Info */}
        <View style={s.cardInfo}>
          <Text style={s.cardName}>{app.name}</Text>
          <Text style={s.cardSubtitle}>{app.subtitle}</Text>
        </View>

        {/* Open arrow */}
        <View style={[s.cardArrow, { borderColor: app.accent + '60' }]}>
          <Text style={[s.cardArrowText, { color: app.accent }]}>›</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0D0F',
  },

  /* Menubar */
  menubar: {
    height: 52,
    backgroundColor: '#111113',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  menubarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#1D6FF2',
    alignItems: 'center', justifyContent: 'center',
  },
  logoGlyph: { color: '#fff', fontSize: 14, fontWeight: '700' },
  logoLabel: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: -0.3 },
  menubarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5,
  },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  pillText: { color: '#fff', fontSize: 11, fontWeight: '600', fontFamily: 'monospace' },
  pillUnit: { color: 'rgba(255,255,255,0.45)', fontWeight: '500' },

  passportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5,
  },
  passportAvatar: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#1D6FF2', alignItems: 'center', justifyContent: 'center',
  },
  passportAvatarText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  passportName: { color: '#fff', fontSize: 11, fontWeight: '600' },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#30D158' },

  connectBtn: {
    backgroundColor: '#1D6FF2', borderRadius: 100,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  connectBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.8 },

  /* Workspace */
  workspace: { flex: 1 },

  /* Window */
  window: {
    flex: 1, margin: 12,
    backgroundColor: '#111113',
    borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6, shadowRadius: 40,
  },
  windowChrome: {
    height: 44,
    backgroundColor: '#18181B',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
  },
  trafficLights: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  trafficLight: { width: 12, height: 12, borderRadius: 6 },
  windowTitle: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  windowTitleIcon: { fontSize: 14 },
  windowTitleText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  windowTitleBadge: {
    borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1.5,
  },
  windowTitleBadgeText: { fontSize: 7, fontWeight: '800', letterSpacing: 0.5 },
  windowReload: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  windowReloadText: { color: '#8E8E93', fontSize: 16 },
  viewport: { flex: 1 },

  /* Springboard */
  springboard: {
    flexGrow: 1, alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 40, paddingBottom: 60,
  },
  hero: { alignItems: 'center', marginBottom: 40, gap: 6 },
  heroEyebrow: {
    color: '#1D6FF2', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.5,
  },
  heroTitle: {
    color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -1.2,
  },
  heroSub: { color: 'rgba(255,255,255,0.4)', fontSize: 14, letterSpacing: -0.2 },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 14, justifyContent: 'center', width: '100%',
    maxWidth: 880,
  },

  /* App card */
  card: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    padding: 20, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 4,
    overflow: 'hidden',
    minHeight: 160,
  },
  cardStrip: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2.5,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  cardIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  cardSymbol: { fontSize: 26, fontWeight: '700' },
  cardInfo: { gap: 3, flex: 1 },
  cardName: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
  cardSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 15 },
  cardArrow: {
    alignSelf: 'flex-end',
    width: 26, height: 26, borderRadius: 8,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  cardArrowText: { fontSize: 18, fontWeight: '300', lineHeight: 22 },

  footerNote: {
    color: 'rgba(255,255,255,0.18)', fontSize: 10,
    letterSpacing: 0.3, marginTop: 40,
  },

  /* Auth overlay / sheet */
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    padding: 24, paddingBottom: 40, gap: 14,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginBottom: 4,
  },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  sheetSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 18 },
});