import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSmartSize } from '../providers/smartProvider';
import { useTheme } from '../providers/ThemeProvider';
import PasskeyAuth from './PasskeyAuth';

// Helper to decode JWT
const parseJwt = (t) => {
  if (!t) return null;
  try {
    const base64Url = t.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

const formatAddress = (address) => {
  if (!address) return 'Not Available';
  if (address.length > 20) {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  }
  return address;
};

export default function UserApp({ verifiedToken, onAuthSuccess, onLogout }) {
  const { normalize: n } = useSmartSize();
  const { colors: theme } = useTheme();

  const bgNested = theme.bg?.nested || (theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)');
  const textMuted = theme.text?.muted || theme.text?.secondary || '#8E8E93';

  const userProfile = useMemo(() => {
    if (verifiedToken) {
      return parseJwt(verifiedToken);
    }
    return null;
  }, [verifiedToken]);

  const [avatarUri, setAvatarUri] = useState(null);

  useEffect(() => {
    const loadAvatar = async () => {
      try {
        const stored = await AsyncStorage.getItem('opendome_user_avatar');
        if (stored) setAvatarUri(stored);
      } catch (e) {
        console.warn('Failed to load avatar', e);
      }
    };
    loadAvatar();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setAvatarUri(uri);
        await AsyncStorage.setItem('opendome_user_avatar', uri);
      }
    } catch (e) {
      console.warn('Failed to pick image', e);
    }
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
      paddingBottom: n(120), // Leave space for dock
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
    profileCard: {
      backgroundColor: theme.bg.card,
      borderRadius: theme.shape?.cardRadius ?? n(24),
      padding: n(24),
      borderWidth: theme.border?.width ?? 1,
      borderColor: theme.border.default,
      marginBottom: n(24),
      ...(theme.shadow?.card || {}),
    },
    avatarPlaceholder: {
      width: n(64),
      height: n(64),
      borderRadius: n(32),
      backgroundColor: bgNested,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: n(16),
      borderWidth: 1,
      borderColor: theme.border.subtle,
      position: 'relative',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: n(32),
    },
    editBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: theme.text.accent || theme.text.primary,
      width: n(22),
      height: n(22),
      borderRadius: n(11),
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.bg.card,
    },
    userName: {
      fontSize: n(24),
      fontWeight: '700',
      color: theme.text.primary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      marginBottom: n(24),
    },
    sectionTitle: {
      fontSize: n(12),
      fontWeight: '700',
      color: textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: n(12),
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    walletRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: n(12),
      borderBottomWidth: 1,
      borderBottomColor: theme.border.subtle,
    },
    walletLabel: {
      fontSize: n(14),
      fontWeight: '600',
      color: theme.text.secondary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    walletAddress: {
      fontSize: n(13),
      color: theme.text.primary,
      fontFamily: theme.typography?.fontFamilyCode || 'monospace',
    },
    logoutButton: {
      backgroundColor: bgNested,
      borderWidth: 1,
      borderColor: theme.border.default,
      borderRadius: n(16),
      paddingVertical: n(16),
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: n(8),
    },
    logoutText: {
      fontSize: n(15),
      fontWeight: '600',
      color: theme.status?.danger || '#FF3B30',
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
  });

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>{userProfile ? 'Profile' : 'Account'}</Text>
          <Text style={s.subtitle}>
            {userProfile ? 'Manage your web3 identity and wallets' : 'Sign in to sync your web3 identity'}
          </Text>
        </View>

        {userProfile ? (
          <View>
            <View style={s.profileCard}>
              <Pressable style={s.avatarPlaceholder} onPress={pickImage}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={s.avatarImage} />
                ) : (
                  <Ionicons name="person" size={n(32)} color={textMuted} />
                )}
                <View style={s.editBadge}>
                  <Ionicons name="camera" size={n(12)} color={theme.bg.card} />
                </View>
              </Pressable>
              <Text style={s.userName}>@{userProfile.username}</Text>

              <Text style={s.sectionTitle}>Connected Wallets</Text>
              
              <View style={s.walletRow}>
                <Text style={s.walletLabel}>Ethereum (EVM)</Text>
                <Text style={s.walletAddress}>{formatAddress(userProfile.evm)}</Text>
              </View>
              
              <View style={s.walletRow}>
                <Text style={s.walletLabel}>Solana</Text>
                <Text style={s.walletAddress}>{formatAddress(userProfile.solana)}</Text>
              </View>

              <View style={[s.walletRow, { borderBottomWidth: 0 }]}>
                <Text style={s.walletLabel}>Starknet</Text>
                <Text style={s.walletAddress}>{formatAddress(userProfile.starknet)}</Text>
              </View>
            </View>

            <Pressable 
              style={({ pressed }) => [s.logoutButton, pressed && { opacity: 0.7 }]}
              onPress={onLogout}
            >
              <Ionicons name="log-out-outline" size={n(20)} color={theme.status?.danger || '#FF3B30'} />
              <Text style={s.logoutText}>Sign Out</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <PasskeyAuth 
              onAuthSuccess={onAuthSuccess} 
              addLog={(msg) => console.log(msg)} 
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
