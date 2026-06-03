import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView,
  Animated, Platform, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSmartSize } from '../../providers/smartProvider';
import { colors, space, radii, type, shadow, springboardApps } from '../../core/tokens';
import DomeIcon from '../../components/DomeIcon';
import FrostedPill from '../../components/FrostedPill';
import GlassCard from '../../components/GlassCard';
import LiveTicker from '../../components/LiveTicker';
import HappeningNow from '../../components/HappeningNow';
import PasskeyAuth from '../../components/PasskeyAuth';
import TransactionModal from '../../components/TransactionModal';
import IframeContainer from '../../components/IframeContainer';

const TOKYO_COORDS = { latitude: 35.70564, longitude: 139.75191 };
const CTX_VARS = [
  { key: 'theme', value: 'dark' },
  { key: 'lang',  value: 'ja'   },
];

export default function Main() {
  const { normalize } = useSmartSize();
  const { width: winW } = useWindowDimensions();

  const [activeApp, setActiveApp] = useState(null);
  const [verifiedToken, setVerifiedToken] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [commJwt, setCommJwt] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [pendingIntent, setPendingIntent] = useState(null);

  // Animations
  const launchAnim    = useRef(new Animated.Value(0)).current;
  const fadeIn        = useRef(new Animated.Value(0)).current;
  const pressScale    = useRef(new Animated.Value(1)).current;
  const heroDrift     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(heroDrift, { toValue: 1, duration: 6000, useNativeDriver: true }),
        Animated.timing(heroDrift, { toValue: 0, duration: 6000, useNativeDriver: true }),
      ])
    ).start();
  }, [fadeIn, heroDrift]);

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
      Animated.timing(fadeIn, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setActiveApp(app));
  };

  const closeApp = () => {
    setActiveApp(null);
    Animated.parallel([
      Animated.spring(launchAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const pillState = userProfile ? 'authenticated' : 'available';
  const onPillPress = userProfile ? handleLogout : () => setShowAuth(true);

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
      {/* Ambient backdrop gradient layers */}
      <View style={s.ambientTop} pointerEvents="none" />
      <View style={s.ambientBottom} pointerEvents="none" />

      <Animated.View style={[s.root, { opacity: fadeIn }]}>
        {activeApp ? (
          /* ────── MINI APP WINDOW ────── */
          <View style={s.windowWrap}>
            <View style={s.windowChrome}>
              <Pressable
                style={({ pressed }) => [s.closeLight, pressed && s.pressed]}
                onPress={closeApp}
                accessibilityRole="button"
                accessibilityLabel="Close window"
              />
              <View style={s.windowTitle}>
                <Text style={s.windowTitleText} numberOfLines={1}>{activeApp.name}</Text>
                <View style={[s.windowTitleDot, { backgroundColor: activeApp.accent, shadowColor: activeApp.accentGlow }]} />
                <Text style={s.windowTitleBadge}>SECURED</Text>
              </View>
              <Pressable
                onPress={() => {
                  if (Platform.OS === 'web') {
                    const f = document.querySelector('iframe');
                    if (f) { const src = f.src; f.src = ''; f.src = src; }
                  }
                }}
                style={({ pressed }) => [s.reloadBtn, pressed && s.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Reload mini app"
              >
                <Text style={s.reloadGlyph}>↻</Text>
              </Pressable>
            </View>
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
          /* ────── SPRINGBOARD ────── */
          <ScrollView
            contentContainerStyle={s.springboard}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          >
            {/* ── Header / Portal ── */}
            <View style={s.header}>
              <View style={s.brandRow}>
                <View style={s.brandMark}>
                  <View style={s.brandMarkInner} />
                </View>
                <View style={s.brandTextBlock}>
                  <Text style={s.brandWordmark} numberOfLines={1} accessibilityRole="header">
                    OPEN·DOME
                  </Text>
                  <Text style={s.brandSubline} numberOfLines={1}>ECOSYSTEM HUB</Text>
                </View>
                <FrostedPill state={pillState} username={userProfile?.username} onPress={onPillPress} />
              </View>
              <LiveTicker />
            </View>

            {/* ── Hero / Display ── */}
            <View style={s.hero}>
              <Animated.View
                style={[
                  s.heroAmbient,
                  {
                    opacity: heroDrift.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] }),
                    transform: [
                      { scale: heroDrift.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.12] }) },
                    ],
                  },
                ]}
                pointerEvents="none"
              />
              <View style={s.heroLabelRow}>
                <View style={s.heroLabelPill}>
                  <Text style={s.heroLabelPillText}>DESTINATION · 01</Text>
                </View>
                <Text style={s.heroLabelSub}>TOKYO DOME CITY · BUNKYO</Text>
              </View>
              <Text style={s.heroTitle} accessibilityRole="header">TOKYO</Text>
              <Text style={s.heroSubtitle}>DOME·CITY</Text>
            </View>

            {/* ── App Card (TDC Events only) ── */}
            {springboardApps.map(app => (
              <AppCard
                key={app.id}
                app={app}
                onPress={() => launchApp(app)}
                onCardPressIn={() => Animated.spring(pressScale, { toValue: 0.98, tension: 200, friction: 18, useNativeDriver: true }).start()}
                onCardPressOut={() => Animated.spring(pressScale, { toValue: 1, tension: 200, friction: 18, useNativeDriver: true }).start()}
                pressScale={pressScale}
              />
            ))}

            {/* ── Footer Telemetry ── */}
            <View style={s.footer}>
              <View style={s.footerLine} />
              <View style={s.footerRow}>
                <Text style={s.footerText}>SECURED · PASSKEY PROTECTED</Text>
                <Text style={s.footerText}>·</Text>
                <Text style={s.footerText}>{springboardApps.length} ACTIVE MODULE</Text>
              </View>
            </View>
          </ScrollView>
        )}
      </Animated.View>

      {/* ── Auth sheet ── */}
      {showAuth && (
        <View style={s.overlay}>
          <Pressable style={s.overlayBackdrop} onPress={() => setShowAuth(false)} accessibilityRole="button" accessibilityLabel="Close auth sheet" />
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

      {/* ── Transaction modal ── */}
      <TransactionModal
        visible={!!pendingIntent}
        intent={pendingIntent}
        onApprove={approveIntent}
        onReject={rejectIntent}
        balances={{ evm: '2.4550', solana: '34.20' }}
      />
    </SafeAreaView>
  );
}

/* ─── App Card ─────────────────────────────────────── */
function AppCard({ app, onPress, onCardPressIn, onCardPressOut, pressScale }) {
  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      <GlassCard
        onPress={onPress}
        accent={app.accent}
        accentGlow={app.accentGlow}
        accessibilityLabel={`Open ${app.name}, ${app.subtitle}`}
        style={s.card}
      >
        {/* Top row: monogram + meta */}
        <View style={s.cardTop}>
          <DomeIcon size={56} accent={app.accent} accentGlow={app.accentGlow} monogram={app.symbol} />
          <View style={s.cardMeta}>
            <Text style={s.cardSubtitle}>{app.subtitle.toUpperCase()}</Text>
            <Text style={s.cardMetaTiny}>{app.meta}</Text>
          </View>
        </View>

        {/* Live status row */}
        <HappeningNow count={app.happening} accent={app.accent} accentGlow={app.accentGlow} />

        {/* Hairline divider */}
        <View style={s.cardHairline} />

        {/* Title block */}
        <View style={s.cardTitleBlock}>
          <Text style={s.cardName} numberOfLines={1}>{app.name}</Text>
          <Text style={s.cardSubline}>SECURE PASSAGE · BIOMETRIC UNLOCK</Text>
        </View>

        {/* CTA — replaces the chevron with a thin "ENTER →" text-only hint */}
        <View style={s.cardFooterRow}>
          <Text style={[s.cardCta, { color: app.accent }]}>ENTER</Text>
          <Text style={[s.cardCtaArrow, { color: app.accent }]}>→</Text>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

/* ─── Styles ────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.canvas },

  // Ambient backdrop glows — two radial-style View layers
  ambientTop: {
    position: 'absolute', top: -80, left: -40, right: -40, height: 280,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    borderRadius: 600,
    ...Platform.select({
      web: { filter: 'blur(80px)' },
      default: { opacity: 0.3 },
    }),
  },
  ambientBottom: {
    position: 'absolute', bottom: -100, left: 20, right: 20, height: 240,
    backgroundColor: 'rgba(255, 46, 146, 0.10)',
    borderRadius: 600,
    ...Platform.select({
      web: { filter: 'blur(80px)' },
      default: { opacity: 0.2 },
    }),
  },

  /* Header */
  header: {
    paddingTop: space.lg,
    paddingHorizontal: space.xl,
    paddingBottom: space.lg,
    gap: space.md,
  },
  brandRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
  },
  brandTextBlock: {
    flex: 1, minWidth: 0, gap: 2,
  },
  brandMark: {
    width: 28, height: 28, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border.glass,
    backgroundColor: colors.bg.cardGlass,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  brandMarkInner: {
    width: 10, height: 10, borderRadius: 2,
    backgroundColor: colors.neon.cyan,
    shadowColor: colors.neon.cyanGlow,
    shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  brandWordmark: {
    color: colors.text.primary,
    fontSize: 12, fontWeight: '800',
    letterSpacing: 2.5, fontFamily: 'monospace',
  },
  brandSubline: {
    color: colors.text.disabled,
    fontSize: 8, fontWeight: '700',
    letterSpacing: 1.2, fontFamily: 'monospace',
  },

  /* Hero */
  hero: {
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.xxl,
    overflow: 'hidden',
  },
  heroAmbient: {
    position: 'absolute', top: -40, left: -40, right: -40, height: 180,
    backgroundColor: 'rgba(0, 224, 255, 0.18)',
    borderRadius: 400,
    ...Platform.select({
      web: { filter: 'blur(70px)' },
      default: { opacity: 0.5 },
    }),
  },
  heroLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md,
  },
  heroLabelPill: {
    paddingHorizontal: space.sm, paddingVertical: 3,
    borderRadius: radii.sm,
    backgroundColor: colors.bg.cardGlass,
    borderWidth: 1, borderColor: colors.border.glass,
  },
  heroLabelPillText: {
    color: colors.neon.cyan, fontSize: 8, fontWeight: '800',
    letterSpacing: 1.5, fontFamily: 'monospace',
  },
  heroLabelSub: {
    color: colors.text.disabled, fontSize: 8, fontWeight: '700',
    letterSpacing: 1.5, fontFamily: 'monospace',
  },
  heroTitle: {
    color: colors.text.primary,
    fontSize: 56, fontWeight: '900',
    letterSpacing: -2, lineHeight: 56,
  },
  heroSubtitle: {
    color: colors.text.secondary,
    fontSize: 28, fontWeight: '300',
    letterSpacing: 4, fontFamily: 'monospace',
  },

  /* Card */
  card: {
    marginHorizontal: space.xl,
    marginTop: space.xl,
    padding: space.xl,
    gap: space.lg,
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'center', gap: space.lg,
  },
  cardMeta: {
    flex: 1, gap: 4,
  },
  cardSubtitle: {
    color: colors.text.muted,
    fontSize: 9, fontWeight: '800',
    letterSpacing: 1.2, fontFamily: 'monospace',
  },
  cardMetaTiny: {
    color: colors.text.disabled,
    fontSize: 9, fontWeight: '600',
    letterSpacing: 1, fontFamily: 'monospace',
  },
  cardHairline: {
    height: 1, backgroundColor: colors.border.subtle,
  },
  cardTitleBlock: {
    gap: 4,
  },
  cardName: {
    color: colors.text.primary,
    fontSize: 28, fontWeight: '800',
    letterSpacing: -0.5, fontFamily: 'monospace',
  },
  cardSubline: {
    color: colors.text.disabled,
    fontSize: 8, fontWeight: '700',
    letterSpacing: 1.5, fontFamily: 'monospace',
  },
  cardFooterRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
  },
  cardCta: {
    fontSize: 11, fontWeight: '800',
    letterSpacing: 4, fontFamily: 'monospace',
  },
  cardCtaArrow: {
    fontSize: 14, fontWeight: '300',
  },

  /* Footer */
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.xxl,
    paddingBottom: space.xl,
  },
  footerLine: {
    height: 1, backgroundColor: colors.border.subtle, marginBottom: space.md,
  },
  footerRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
  },
  footerText: {
    color: colors.text.disabled, fontSize: 8,
    fontWeight: '700', letterSpacing: 1.5, fontFamily: 'monospace',
  },

  /* Window */
  windowWrap: {
    flex: 1, margin: space.md,
    borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border.glass,
    backgroundColor: colors.bg.cardGlass, overflow: 'hidden',
    ...shadow.lg,
  },
  windowChrome: {
    height: 44, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: space.lg, gap: space.md,
    borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
  },
  closeLight: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.traffic.close,
  },
  windowTitle: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: space.sm,
  },
  windowTitleText: {
    color: colors.text.primary, fontSize: 11,
    fontWeight: '800', letterSpacing: 2, fontFamily: 'monospace',
  },
  windowTitleDot: {
    width: 5, height: 5, borderRadius: 3,
    shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  windowTitleBadge: {
    color: colors.text.muted, fontSize: 8,
    fontWeight: '800', letterSpacing: 1.5, fontFamily: 'monospace',
  },
  reloadBtn: {
    width: 28, height: 28, borderRadius: 6,
    borderWidth: 1, borderColor: colors.border.glass,
    alignItems: 'center', justifyContent: 'center',
  },
  reloadGlyph: {
    color: colors.text.muted, fontSize: 14, fontWeight: '700',
  },
  viewport: { flex: 1 },

  /* Overlay / sheet */
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 100 },
  overlayBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bg.overlay },
  sheet: {
    backgroundColor: colors.bg.modal, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl,
    borderTopWidth: 1, borderColor: colors.border.glass,
    padding: space.xxl, paddingBottom: space.massive, gap: space.lg,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border.glass, alignSelf: 'center', marginBottom: space.xs,
  },
  sheetTitle: {
    color: colors.text.primary, fontSize: 22, fontWeight: '800',
    letterSpacing: -0.5,
  },
  sheetSub: {
    color: colors.text.secondary, fontSize: 13, lineHeight: 18,
  },
});
