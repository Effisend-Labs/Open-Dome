import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSmartSize } from '../providers/smartProvider';
import { useTheme } from '../providers/ThemeProvider';

export default function StoreApp({ installedAppIds, onInstallApp, onUninstallApp }) {
  const { normalize: n } = useSmartSize();
  const { colors: theme } = useTheme();
  
  const [storeApps, setStoreApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    iconWrapper: {
      width: n(50),
      height: n(50),
      borderRadius: n(12),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
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
      paddingHorizontal: n(16),
      paddingVertical: n(6),
      borderRadius: n(16),
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: n(72),
    },
    actionBtnInstalled: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.border.default,
    },
    actionText: {
      fontSize: n(14),
      fontWeight: '700',
      color: theme.text.accent || theme.text.primary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      letterSpacing: -0.2,
    },
    actionTextInstalled: {
      color: theme.text.secondary,
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
              return (
                <View key={app.id} style={s.card}>
                  <View style={[s.iconWrapper, { backgroundColor: app.color || s.iconWrapper.backgroundColor }]}>
                    <Ionicons name={app.icon} size={n(26)} color="#FFFFFF" />
                  </View>
                  <View style={s.meta}>
                    <Text style={s.appName}>{app.name}</Text>
                    <Text style={s.appDesc} numberOfLines={2}>{app.description}</Text>
                    <Text style={s.publisher}>{app.publisher}</Text>
                  </View>
                  <Pressable 
                    style={[s.actionBtn, isInstalled && s.actionBtnInstalled]}
                    onPress={() => isInstalled ? onUninstallApp(app.id) : onInstallApp(app)}
                  >
                    <Text style={[s.actionText, isInstalled && s.actionTextInstalled]}>
                      {isInstalled ? 'REMOVE' : 'GET'}
                    </Text>
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
