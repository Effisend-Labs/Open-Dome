import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  View,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSmartSize } from '../providers/smartProvider';
import { useTheme } from '../providers/ThemeProvider';
import { STORE_APP_ICONS } from '../core/storeAppIcons';
import { isAltagaGodToken, isStaffToken } from '../core/godAccess';
import { StoreAppCard } from '../features/store/StoreAppCard';

const ACTION_DURATION_MS = 5000;
const CLOSE_BTN = 36;

export default function StoreApp({
  installedAppIds,
  onInstallApp,
  onUninstallApp,
  verifiedToken,
}) {
  const { normalize: n } = useSmartSize();
  const { colors: theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [storeApps, setStoreApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingActions, setPendingActions] = useState({});
  const progressRefs = useRef({});
  const iconPulseRefs = useRef({});
  const isGod = isAltagaGodToken(verifiedToken);
  const isStaff = isStaffToken(verifiedToken);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/apps');
        const json = await res.json();
        if (json.success && json.data) setStoreApps(json.data);
        else setError('Failed to load apps');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visibleApps = storeApps.filter((app) => {
    if (app.godOnly && !isGod) return false;
    if (app.staffOnly && !isStaff) return false;
    return true;
  });

  useEffect(() => () => {
    Object.values(progressRefs.current).forEach((v) => v.stopAnimation?.());
    Object.values(iconPulseRefs.current).forEach((v) => v.stopAnimation?.());
  }, []);

  const getProgress = (appId) => {
    if (!progressRefs.current[appId]) progressRefs.current[appId] = new Animated.Value(0);
    return progressRefs.current[appId];
  };

  const getIconPulse = (appId) => {
    if (!iconPulseRefs.current[appId]) iconPulseRefs.current[appId] = new Animated.Value(1);
    return iconPulseRefs.current[appId];
  };

  const handleAction = (app, isInstalled) => {
    if (pendingActions[app.id]) return;
    if (isInstalled) onUninstallApp(app.id);
    else onInstallApp(app);

    const progress = getProgress(app.id);
    progress.setValue(0);
    setPendingActions((prev) => ({ ...prev, [app.id]: isInstalled ? 'uninstall' : 'install' }));
    const pulse = getIconPulse(app.id);
    pulse.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.92, duration: 600, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: false }),
      ]),
    ).start();

    Animated.timing(progress, {
      toValue: 1,
      duration: ACTION_DURATION_MS,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      pulse.stopAnimation();
      pulse.setValue(1);
      setPendingActions((prev) => {
        const next = { ...prev };
        delete next[app.id];
        return next;
      });
      progress.setValue(0);
    });
  };

  const font = Platform.select({
    ios: 'System',
    web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
    default: 'sans-serif',
  });
  const topPad = Math.max(insets.top, n(16)) + n(8) + n(CLOSE_BTN) + n(20);

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: n(20),
          paddingTop: topPad,
          paddingBottom: n(120),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: n(24) }}>
          <Text
            style={{
              fontSize: n(28),
              fontWeight: '800',
              color: theme.text.primary,
              fontFamily: theme.typography?.fontFamily || font,
              letterSpacing: -0.6,
            }}
          >
            OpenStore
          </Text>
          <Text
            style={{
              fontSize: n(15),
              color: theme.isDark ? 'rgba(255,255,255,0.72)' : theme.text.secondary,
              fontFamily: theme.typography?.fontFamily || font,
              marginTop: n(6),
            }}
          >
            Add mini-apps to your home screen
          </Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: n(60), alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.text.primary} />
          </View>
        ) : error ? (
          <View style={{ paddingVertical: n(60), alignItems: 'center' }}>
            <Ionicons name="warning" size={n(32)} color={theme.text.secondary} />
            <Text style={{ marginTop: n(12), color: theme.text.secondary }}>{error}</Text>
          </View>
        ) : (
          <View style={{ gap: n(10) }}>
            {visibleApps.map((app) => {
              const isInstalled = installedAppIds.includes(app.id);
              const pending = pendingActions[app.id];
              return (
                <StoreAppCard
                  key={app.id}
                  app={app}
                  iconSource={STORE_APP_ICONS[app.id]}
                  isInstalled={isInstalled}
                  isPending={Boolean(pending)}
                  pendingLabel={pending === 'install' ? 'Installing…' : 'Removing…'}
                  progress={getProgress(app.id)}
                  iconPulse={getIconPulse(app.id)}
                  onPress={() => handleAction(app, isInstalled)}
                  n={n}
                  theme={theme}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
