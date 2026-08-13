import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

export function StoreAppCard({
  app,
  iconSource,
  isInstalled,
  isPending,
  pendingLabel,
  progress,
  iconPulse,
  onPress,
  n,
  theme,
}) {
  return (
    <View style={[styles.card(n, theme), isPending && styles.cardPending(theme)]}>
      <Animated.View style={[styles.iconWrap(n, theme), { transform: [{ scale: iconPulse }] }]}>
        {iconSource ? (
          <Image source={iconSource} style={styles.logo} contentFit="contain" />
        ) : (
          <Ionicons name={app.icon || 'apps'} size={n(26)} color={theme.text.primary} />
        )}
      </Animated.View>

      <View style={styles.meta}>
        <Text style={styles.name(n, theme)} numberOfLines={1}>
          {app.name}
        </Text>
        <Text style={styles.desc(n, theme)} numberOfLines={2}>
          {app.description}
        </Text>
      </View>

      <Pressable
        disabled={isPending}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={isInstalled ? `Remove ${app.name}` : `Get ${app.name}`}
        style={[
          styles.btn(n),
          isInstalled ? styles.btnRemove(theme) : styles.btnGet(theme),
          isPending && styles.btnPending(theme),
        ]}
      >
        {isPending ? (
          <>
            <Animated.View
              style={[
                styles.progress(theme),
                {
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
            <Text style={styles.btnTextPending(n, theme)}>{pendingLabel}</Text>
          </>
        ) : (
          <Text
            style={[
              styles.btnText(n),
              isInstalled
                ? { color: theme.isDark ? '#FFFFFF' : '#111111' }
                : styles.btnTextGet,
            ]}
          >
            {isInstalled ? 'Remove' : 'Get'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = {
  card: (n, theme) => ({
    backgroundColor: theme.bg.card,
    borderRadius: theme.shape?.cardRadius ?? n(20),
    paddingVertical: n(14),
    paddingHorizontal: n(14),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border.subtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: n(12),
  }),
  cardPending: (theme) => ({
    borderColor: theme.text.accent || '#007AFF',
  }),
  iconWrap: (n, theme) => ({
    width: n(56),
    height: n(56),
    borderRadius: n(14),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border.subtle,
  }),
  logo: { width: '100%', height: '100%' },
  meta: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 4 },
  name: (n, theme) => ({
    fontSize: n(16),
    fontWeight: '700',
    color: theme.text.primary,
    letterSpacing: -0.2,
  }),
  desc: (n, theme) => ({
    fontSize: n(13),
    lineHeight: n(18),
    color: theme.isDark ? 'rgba(255,255,255,0.82)' : theme.text.secondary,
    fontWeight: '500',
  }),
  btn: (n) => ({
    minWidth: n(76),
    height: n(36),
    paddingHorizontal: n(16),
    borderRadius: n(18),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  }),
  btnGet: () => ({
    backgroundColor: '#007AFF',
  }),
  btnRemove: (theme) => ({
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)',
  }),
  btnPending: (theme) => ({
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
  }),
  progress: (theme) => ({
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,122,255,0.35)',
  }),
  btnText: (n) => ({
    fontSize: n(14),
    fontWeight: '700',
    letterSpacing: -0.2,
  }),
  btnTextGet: { color: '#FFFFFF' },
  btnTextPending: (n, theme) => ({
    fontSize: n(12),
    fontWeight: '700',
    color: theme.text.primary,
    zIndex: 1,
  }),
};
