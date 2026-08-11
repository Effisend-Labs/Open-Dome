import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  Pressable,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSmartSize } from '../providers/smartProvider';
import { useTheme } from '../providers/ThemeProvider';
import { STORE_APP_ICONS } from '../core/storeAppIcons';

const ACTION_DURATION_MS = 5000;

export default function StoreApp({ installedAppIds, onInstallApp, onUninstallApp }) {
  const { normalize: n } = useSmartSize();
  const { colors: theme } = useTheme();

  const [storeApps, setStoreApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingActions, setPendingActions] = useState({});
  const progressRefs = useRef({});
  const iconPulseRefs = useRef({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/apps');
        const json = await res.json();
        if (json.success && json.data) {
          setStoreApps(json.data);
        } else {
          setError('Failed to load apps');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      Object.values(progressRefs.current).forEach((v) => v.stopAnimation?.());
      Object.values(iconPulseRefs.current).forEach((v) => v.stopAnimation?.());
    };
  }, []);

  const getProgress = (appId) => {
    if (!progressRefs.current[appId]) {
      progressRefs.current[appId] = new Animated.Value(0);
    }
    return progressRefs.current[appId];
  };

  const getIconPulse = (appId) => {
    if (!iconPulseRefs.current[appId]) {
      iconPulseRefs.current[appId] = new Animated.Value(1);
    }
    return iconPulseRefs.current[appId];
  };

  const startIconPulse = (appId) => {
    const pulse = getIconPulse(appId);
    pulse.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.92, duration: 600, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: false }),
      ])
    ).start();
  };

  const stopIconPulse = (appId) => {
    const pulse = getIconPulse(appId);
    pulse.stopAnimation();
    pulse.setValue(1);
  };

  const handleAction = (app, isInstalled) => {
    if (pendingActions[app.id]) return;

    if (isInstalled) {
      onUninstallApp(app.id);
    } else {
      onInstallApp(app);
    }

    const progress = getProgress(app.id);
    progress.setValue(0);
    setPendingActions((prev) => ({
      ...prev,
      [app.id]: isInstalled ? 'uninstall' : 'install',
    }));
    startIconPulse(app.id);

    Animated.timing(progress, {
      toValue: 1,
      duration: ACTION_DURATION_MS,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        stopIconPulse(app.id);
        setPendingActions((prev) => {
          const next = { ...prev };
          delete next[app.id];
          return next;
        });
        progress.setValue(0);
      }
    });
  };

  const defaultFont = Platform.select({
    ios: 'System',
    web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
    default: 'sans-serif',
  });

  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scrollContent: {
      padding: n(24),
      paddingTop: n(40),
      paddingBottom: n(120),
    },
    header: {
      marginBottom: n(32),
    },
    title: {
      fontSize: n(32),
      fontWeight: '800',
      color: theme.text.primary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: n(15),
      color: theme.text.secondary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      marginTop: n(4),
    },
    cardList: {
      gap: n(12),
    },
    card: {
      backgroundColor: theme.bg.card,
      borderRadius: theme.shape?.cardRadius ?? n(20),
      padding: n(16),
      borderWidth: 1,
      borderColor: theme.border.subtle,
      flexDirection: 'row',
      alignItems: 'center',
      gap: n(16),
      ...(theme.shadow?.card || {}),
    },
    cardPending: {
      borderColor: theme.text.accent || theme.border.default,
    },
    iconWrapper: {
      width: n(56),
      height: n(56),
      borderRadius: n(14),
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: theme.isDark ? '#000000' : '#F2F2F7',
      borderWidth: 1,
      borderColor: theme.border.subtle,
    },
    logoImage: {
      width: '100%',
      height: '100%',
    },
    meta: {
      flex: 1,
      justifyContent: 'center',
    },
    appName: {
      fontSize: n(16),
      fontWeight: '700',
      color: theme.text.primary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      letterSpacing: -0.2,
      marginBottom: n(2),
    },
    appDesc: {
      fontSize: n(13),
      color: theme.isDark ? 'rgba(255,255,255,0.7)' : theme.text.secondary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      lineHeight: n(18),
    },
    publisher: {
      fontSize: n(10),
      color: theme.isDark ? 'rgba(255,255,255,0.5)' : theme.text.muted,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      marginTop: n(4),
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontWeight: '600',
    },
    actionBtn: {
      backgroundColor: theme.bg.nested,
      paddingHorizontal: n(12),
      paddingVertical: n(6),
      borderRadius: n(16),
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: n(96),
      overflow: 'hidden',
      position: 'relative',
    },
    actionBtnInstalled: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.border.default,
    },
    actionBtnPending: {
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      borderWidth: 1,
      borderColor: theme.border.subtle,
    },
    actionProgress: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: theme.isDark
        ? 'rgba(0,122,255,0.25)'
        : 'rgba(0,122,255,0.15)',
      borderRadius: n(16),
    },
    actionText: {
      fontSize: n(13),
      fontWeight: '700',
      color: theme.text.accent || theme.text.primary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      letterSpacing: -0.2,
    },
    actionTextInstalled: {
      color: theme.text.secondary,
    },
    actionTextPending: {
      fontSize: n(12),
      fontWeight: '700',
      color: theme.text.primary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      letterSpacing: -0.2,
      zIndex: 1,
    },
    centerState: {
      paddingVertical: n(60),
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>OpenStore</Text>
          <Text style={s.subtitle}>Discover and manage your MiniApps</Text>
        </View>

        {loading ? (
          <View style={s.centerState}>
            <ActivityIndicator size="large" color={theme.text.primary} />
          </View>
        ) : error ? (
          <View style={s.centerState}>
            <Ionicons name="warning" size={n(32)} color={theme.text.secondary} />
            <Text style={[s.subtitle, { marginTop: n(12) }]}>{error}</Text>
          </View>
        ) : (
          <View style={s.cardList}>
            {storeApps.map((app) => {
              const isInstalled = installedAppIds.includes(app.id);
              const pending = pendingActions[app.id];
              const isPending = Boolean(pending);
              const progress = getProgress(app.id);
              const iconPulse = getIconPulse(app.id);
              const iconSource = STORE_APP_ICONS[app.id];

              return (
                <View key={app.id} style={[s.card, isPending && s.cardPending]}>
                  <Animated.View
                    style={[s.iconWrapper, { transform: [{ scale: iconPulse }] }]}
                  >
                    {iconSource ? (
                      <Image
                        source={iconSource}
                        style={s.logoImage}
                        contentFit="cover"
                      />
                    ) : (
                      <Ionicons name={app.icon} size={n(26)} color={theme.text.primary} />
                    )}
                  </Animated.View>
                  <View style={s.meta}>
                    <Text style={s.appName}>{app.name}</Text>
                    <Text style={s.appDesc} numberOfLines={2}>
                      {app.description}
                    </Text>
                    <Text style={s.publisher}>{app.publisher}</Text>
                  </View>
                  <Pressable
                    disabled={isPending}
                    style={[
                      s.actionBtn,
                      isInstalled && !isPending && s.actionBtnInstalled,
                      isPending && s.actionBtnPending,
                    ]}
                    onPress={() => handleAction(app, isInstalled)}
                  >
                    {isPending ? (
                      <>
                        <Animated.View
                          style={[
                            s.actionProgress,
                            {
                              width: progress.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                              }),
                            },
                          ]}
                        />
                        <Text style={s.actionTextPending}>
                          {pending === 'install' ? 'Installing…' : 'Removing…'}
                        </Text>
                      </>
                    ) : (
                      <Text style={[s.actionText, isInstalled && s.actionTextInstalled]}>
                        {isInstalled ? 'REMOVE' : 'GET'}
                      </Text>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
