import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView,
  Animated, Platform, StatusBar, Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import IframeContainer from '../../components/IframeContainer';
import { springboardApps } from '../../core/tokens';
import { useSmartSize } from '../../providers/smartProvider';
import { useTheme, WALLPAPERS } from '../../providers/ThemeProvider';
import SettingsApp from '../../components/SettingsApp';
import UserApp from '../../components/UserApp';
import WalletApp from '../../components/WalletApp';
import QRApp from '../../components/QRApp';
import VectorBackground from '../../components/VectorBackground';
import { locales } from '../../core/locales';
import ContextModule from '../../providers/contextModule';
import { Events } from '../../core/events';
import StoreApp from '../../components/StoreApp';
import { enrichStoreApp } from '../../core/storeAppIcons';
import MapApp from '../../components/MapApp';
import { isAltagaGodToken, isStaffToken } from '../../core/godAccess';
import DomeAgentView from '../../features/agent/DomeAgentView';


const CORE_APPS = [
  { id: 'store', name: 'OpenStore', icon: 'bag-handle', color: '#007AFF' },
  { id: 'settings', name: 'Settings', icon: 'settings', color: '#8E8E93' },
];

// Helper to simulate glassmorphism across platforms
const getGlassStyles = (theme) => Platform.select({
  web: {
    backgroundColor: theme.isDark ? 'rgba(28, 28, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(24px)',
    borderWidth: theme.border?.width ?? 1,
    borderColor: theme.border.default, // Use default border for clearer component framing
  },
  default: {
    backgroundColor: theme.bg.panel,
    borderWidth: theme.border?.width ?? 1,
    borderColor: theme.border.default,
  }
});

const defaultFont = Platform.select({
  ios: 'System',
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  default: 'sans-serif',
});

export default function Main() {
  const { normalize: n, keyboardInset } = useSmartSize();
  const keyboardOpen = keyboardInset > 80;
  const { themeId, wallpaperId, colors: theme, language, isLoaded } = useTheme();
  const insets = useSafeAreaInsets();
  const t = locales[language]?.os || locales.en.os;
  const globalContext = React.useContext(ContextModule);
  
  useEffect(() => {
    if (globalContext?.setValue) {
      globalContext.setValue({
        theme: themeId,
        language: language
      });
    }
  }, [themeId, language, globalContext?.setValue]);
  
  const CTX_VARS = React.useMemo(() => [
    { key: 'theme', value: themeId },
    { key: 'lang',  value: language },
  ], [themeId, language]);
  
  const glassStyles = React.useMemo(() => getGlassStyles(theme), [theme]);
  const s = React.useMemo(() => useStyles(n, theme), [n, theme]);
  
  const [activeApp, setActiveApp] = useState(null);
  const [appsLayout, setAppsLayout] = useState(CORE_APPS);
  const [installedAppIds, setInstalledAppIds] = useState(['demo', 'store', 'settings']);
  const [availableApps, setAvailableApps] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [verifiedToken, setVerifiedToken] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [nextEvent, setNextEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [appToDelete, setAppToDelete] = useState(null);

  const confirmDelete = () => {
    if (appToDelete) {
      handleUninstallApp(appToDelete.id);
      setAppToDelete(null);
    }
  };

  useEffect(() => {
    try {
      const allEvents = Events.getAll();
      if (allEvents && allEvents.length > 0) {
        // Just take the first one
        setNextEvent(allEvents[0]);
      }
    } catch (e) {
      console.warn('Failed to fetch events', e);
    }
  }, []);
  
  const fadeIn = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.3)).current;
  const jiggle = useRef(new Animated.Value(0)).current;

  // Load saved layout + store catalog together to avoid race condition
  useEffect(() => {
    (async () => {
      // Auth first so god-only store apps (Admin) can filter correctly
      try {
        const savedToken = await AsyncStorage.getItem('opendome_auth_token');
        if (savedToken) {
          setVerifiedToken(savedToken);
        }
      } catch (e) {}

      let fetchedApps = [];
      try {
        const res = await fetch('/api/apps');
        const json = await res.json();
        if (json.success && json.data) {
          fetchedApps = json.data;
        }
      } catch (e) {
        console.warn('Failed to fetch available apps', e);
      }

      let ids = ['demo', 'store', 'settings'];
      try {
        const savedIds = await AsyncStorage.getItem('opendome_installed_app_ids');
        if (savedIds) {
          const parsedIds = JSON.parse(savedIds).map((id) =>
            id === 'miniapp' ? 'demo' : id
          );
          ids = [...new Set(parsedIds)];
          await AsyncStorage.setItem(
            'opendome_installed_app_ids',
            JSON.stringify(ids)
          );
        }
      } catch (e) {}

      // Set both at once so the layout effect has the full catalog
      setAvailableApps(fetchedApps);
      setInstalledAppIds(ids);
    })();
  }, []);

  useEffect(() => {
    const allowAdmin = isAltagaGodToken(verifiedToken);
    const allowScanner = isStaffToken(verifiedToken);
    const newLayout = installedAppIds.map(id => {
      if (id === 'admin' && !allowAdmin) return null;
      if (id === 'scanner' && !allowScanner) return null;
      const core = CORE_APPS.find(c => c.id === id);
      if (core) return core;
      return enrichStoreApp(availableApps.find(a => a.id === id));
    }).filter(Boolean);
    setAppsLayout(newLayout);
  }, [installedAppIds, availableApps, verifiedToken]);

  // Initial fade-in & pulsing dot
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: false }).start();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.3, duration: 1500, useNativeDriver: false })
      ])
    ).start();
  }, [fadeIn, pulse]);

  // Jiggle animation loop
  useEffect(() => {
    if (isEditing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(jiggle, { toValue: 1, duration: 120, useNativeDriver: false }),
          Animated.timing(jiggle, { toValue: -1, duration: 120, useNativeDriver: false }),
          Animated.timing(jiggle, { toValue: 0, duration: 120, useNativeDriver: false })
        ])
      ).start();
    } else {
      jiggle.setValue(0);
      jiggle.stopAnimation();
      setSelectedAppId(null);
    }
  }, [isEditing, jiggle]);

  const saveLayout = async (newLayout) => {
    setAppsLayout(newLayout);
    try {
      // Only store IDs to avoid serializing require() Metro module IDs
      const idsOnly = newLayout.map(a => a.id);
      setInstalledAppIds(idsOnly);
      await AsyncStorage.setItem('opendome_installed_app_ids', JSON.stringify(idsOnly));
    } catch (e) {}
  };

  const handleInstallApp = async (app) => {
    const newIds = [...installedAppIds, app.id];
    setInstalledAppIds(newIds);
    await AsyncStorage.setItem('opendome_installed_app_ids', JSON.stringify(newIds));
  };

  const handleUninstallApp = async (appId) => {
    const newIds = installedAppIds.filter(id => id !== appId);
    setInstalledAppIds(newIds);
    await AsyncStorage.setItem('opendome_installed_app_ids', JSON.stringify(newIds));
  };

  const handleUserAuthChanged = async (authData) => {
    try {
      if (authData && authData.token) {
        setVerifiedToken(authData.token);
        await AsyncStorage.setItem('opendome_auth_token', authData.token);
      } else {
        setVerifiedToken(null);
        await AsyncStorage.removeItem('opendome_auth_token');
      }
    } catch (e) {
      console.warn('Failed to save auth token', e);
    }
  };

  const handleAppPress = (appId) => {
    if (isEditing) {
      if (selectedAppId === null) {
        setSelectedAppId(appId);
      } else {
        if (selectedAppId === appId) {
          setSelectedAppId(null); // deselect
        } else {
          // Swap logic
          const newLayout = [...appsLayout];
          const index1 = newLayout.findIndex(a => a.id === selectedAppId);
          const index2 = newLayout.findIndex(a => a.id === appId);
          const temp = newLayout[index1];
          newLayout[index1] = newLayout[index2];
          newLayout[index2] = temp;
          saveLayout(newLayout);
          setSelectedAppId(null);
        }
      }
    } else {
      // Launch the specific URL if the app has one, else use default
      const targetApp = appsLayout.find(a => a.id === appId);
      const targetUrl = targetApp?.url || springboardApps[0]?.url || 'https://demo.opendome.xyz/';
      setActiveApp({ id: appId, url: targetUrl });
    }
  };

  const handleLongPress = () => {
    if (!isEditing) setIsEditing(true);
  };

  const closeApp = () => setActiveApp(null);

  return (
    <View style={s.desktopWrapper}>
      <StatusBar barStyle="light-content" />
      
      <Animated.View style={[s.root, { opacity: fadeIn }]}>
        {/* --- VECTOR WALLPAPER --- */}
        <VectorBackground themeId={themeId} theme={theme} />

        {activeApp ? (
          /* ────── MINI APP CANVAS ────── */
          <View style={s.canvasWrap}>
            {activeApp.id === 'settings' ? (
              <SettingsApp />
            ) : activeApp.id === 'store' ? (
              <StoreApp 
                installedAppIds={installedAppIds}
                onInstallApp={handleInstallApp}
                onUninstallApp={handleUninstallApp}
                verifiedToken={verifiedToken}
              />
            ) : activeApp.id === 'app2' ? (
              <MapApp />
            ) : (
              <IframeContainer
                activeUrl={activeApp.url}
                verifiedToken={verifiedToken}
                contextVariables={CTX_VARS}
                onUserAuthChanged={handleUserAuthChanged}
                onTransactionIntent={() => {}}
                onAddLog={(msg) => console.log(msg)}
                gpsLocation={null}
              />
            )}
            {/* Minimal Centered Exit Cross */}
            <Pressable style={[s.exitCapsule, { top: Math.max(insets.top, n(16)) + n(8) }]} onPress={closeApp}>
              <View style={[s.perfectCrossLine, { transform: [{ rotate: '45deg' }] }]} />
              <View style={[s.perfectCrossLine, { transform: [{ rotate: '-45deg' }] }]} />
            </Pressable>
          </View>
        ) : (
          /* ────── OPENDOME OS HOME SCREEN ────── */
          <View style={s.osShell}>
            
            {/* A. Dynamic Island */}
            <View style={[s.islandWrapper, { paddingTop: Math.max(insets.top, n(16)) + n(8) }]}>
              <View style={s.dynamicIsland}>
                <Animated.View style={[s.islandDot, { opacity: pulse }]} />
                <Text style={s.islandText}>{t.crowdLevel}</Text>
              </View>
              {isEditing && (
                <Pressable style={s.doneButton} onPress={() => setIsEditing(false)}>
                  <Text style={s.doneButtonText}>{t.done}</Text>
                </Pressable>
              )}
            </View>

            <View
              collapsable={false}
              pointerEvents={activeTab === 'agent' ? 'auto' : 'none'}
              style={[s.tabKeep, activeTab !== 'agent' && s.tabHidden]}
            >
              <DomeAgentView verifiedToken={verifiedToken} />
            </View>

            {activeTab === 'person' ? (
              <View style={s.tabKeep}>
                <UserApp 
                  verifiedToken={verifiedToken} 
                  onAuthSuccess={(token) => handleUserAuthChanged({ token })}
                  onLogout={() => handleUserAuthChanged(null)}
                />
              </View>
            ) : activeTab === 'passes' ? (
              <WalletApp verifiedToken={verifiedToken} />
            ) : activeTab === 'qr' ? (
              <QRApp verifiedToken={verifiedToken} />
            ) : activeTab === 'home' ? (
              <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
              
              {/* B. Smart Widgets */}
              <View style={s.widgetSection}>
                {/* Widget 1 */}
                <View style={[s.widgetLarge, glassStyles]}>
                  <Text style={s.widgetSubtitle}>{t.nextEvent}</Text>
                  <Text style={s.widgetTitle}>{nextEvent?.title || t.eventTitle}</Text>
                  <Pressable style={s.ctaButton} onPress={() => setShowEventModal(true)}>
                    <Text style={s.ctaButtonText}>View Event Info</Text>
                  </Pressable>
                </View>

              </View>

              {/* C. Mini-App Grid */}
              <View style={s.appGrid}>
                {(() => {
                  const remainder = appsLayout.length % 4;
                  const placeholdersCount = remainder === 0 ? 0 : 4 - remainder;
                  const displayApps = [...appsLayout];
                  for (let i = 0; i < placeholdersCount; i++) {
                    displayApps.push({ id: `placeholder_${i}`, isPlaceholder: true });
                  }
                  
                  return displayApps.map((app) => {
                    if (app.isPlaceholder) {
                      return <View key={app.id} style={s.appIconWrapper} />;
                    }

                    const isSelected = isEditing && selectedAppId === app.id;
                  const animatedStyle = isEditing ? {
                    transform: [{
                      rotate: jiggle.interpolate({
                        inputRange: [-1, 1],
                        outputRange: ['-2deg', '2deg']
                      })
                    }]
                  } : {};
                  
                  let appColor = app.color;
                  let iconColor = '#FFFFFF';

                  if (theme.icons?.overrideBg) {
                    appColor = theme.icons.overrideBg;
                    iconColor = theme.icons.overrideColor || '#FFFFFF';
                  } else if (theme.icons?.mapColors && theme.icons.mapColors[app.color]) {
                    appColor = theme.icons.mapColors[app.color];
                    // If the theme is pastel, a dark icon often looks better on light pastel squares, 
                    // or keep it white? Let's use theme's primary text if it's light mode pastel
                    iconColor = theme.isDark ? '#FFFFFF' : theme.text.primary;
                  } else if (theme.icons?.desaturate && app.color !== '#FFFFFF') {
                    appColor = '#78909C'; // Muted slate color
                  }
                  
                  const isCoreApp = ['store', 'settings'].includes(app.id);
                  
                  return (
                    <Animated.View key={app.id} style={[s.appIconWrapper, animatedStyle]}>
                      <View>
                        {isEditing && !isCoreApp && (
                          <Pressable 
                            style={s.deleteBadge} 
                            onPress={() => setAppToDelete(app)}
                            hitSlop={15}
                          >
                            <Ionicons name="remove" size={n(18)} color="#000000" />
                          </Pressable>
                        )}
                        <Pressable 
                          onPress={() => handleAppPress(app.id)} 
                          onLongPress={handleLongPress}
                          delayLongPress={500}
                        >
                          <View style={[s.appIcon, app.iconSource ? s.appIconLogoShell : { backgroundColor: appColor }, isSelected && s.appIconSelected]}>
                            {app.iconSource ? (
                              <Image source={app.iconSource} style={s.appIconLogo} contentFit="cover" />
                            ) : app.iconUrl ? (
                              <Image source={{ uri: app.iconUrl }} style={[s.appIconImage, (theme.icons?.overrideColor || theme.icons?.mapColors) ? { tintColor: iconColor } : {}]} contentFit="contain" />
                            ) : (
                              <Ionicons name={app.icon} size={n(28)} color={iconColor} />
                            )}
                          </View>
                          <Text style={s.appLabel}>{t.apps[app.id] || app.name}</Text>
                        </Pressable>
                      </View>
                    </Animated.View>
                  );
                  });
                })()}
              </View>
              
            </ScrollView>
            ) : null}

            {/* D. System Dock */}
            <View
              style={[
                s.dockWrapper,
                keyboardOpen && { opacity: 0, pointerEvents: 'none' },
              ]}
            >
              <View style={[s.dock, glassStyles]}>
                <Pressable style={s.dockBtn} onPress={() => { setActiveTab('home'); closeApp(); }}>
                  <Ionicons name="home" size={n(24)} color={theme.text.primary} style={activeTab === 'home' ? {} : { opacity: 0.6 }} />
                </Pressable>
                <Pressable style={s.dockBtn} onPress={() => { setActiveTab('agent'); closeApp(); }}>
                  <Ionicons name="sparkles" size={n(24)} color={theme.text.primary} style={activeTab === 'agent' ? {} : { opacity: 0.6 }} />
                </Pressable>
                <Pressable style={s.dockBtn} onPress={() => { setActiveTab('passes'); closeApp(); }}>
                  <Ionicons name="ticket" size={n(24)} color={theme.text.primary} style={activeTab === 'passes' ? {} : { opacity: 0.6 }} />
                </Pressable>
                <Pressable style={s.dockBtn} onPress={() => { setActiveTab('qr'); closeApp(); }}>
                  <Ionicons name="qr-code" size={n(24)} color={theme.text.primary} style={activeTab === 'qr' ? {} : { opacity: 0.6 }} />
                </Pressable>
                <Pressable style={s.dockBtn} onPress={() => { setActiveTab('person'); closeApp(); }}>
                  <Ionicons name="person" size={n(24)} color={theme.text.primary} style={activeTab === 'person' ? {} : { opacity: 0.6 }} />
                </Pressable>
              </View>
            </View>

          </View>
        )}

        <Modal visible={!!appToDelete} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Remove "{appToDelete?.name || 'App'}"?</Text>
              <Text style={s.modalSubtitle}>This app will be removed from your home screen. You can add it back later from the OpenStore.</Text>
              <View style={s.modalActions}>
                <Pressable style={[s.modalBtn, s.modalBtnCancel]} onPress={() => setAppToDelete(null)}>
                  <Text style={s.modalBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={[s.modalBtn, s.modalBtnDelete]} onPress={confirmDelete}>
                  <Text style={[s.modalBtnText, s.modalBtnTextDelete]}>Remove</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showEventModal} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.eventModalCard}>
              <View style={s.eventModalHeaderRow}>
                <Text style={s.modalTitle}>Event Information</Text>
                <Pressable onPress={() => setShowEventModal(false)} hitSlop={10}>
                  <Ionicons name="close-circle" size={n(24)} color={theme.text.secondary} />
                </Pressable>
              </View>
              
              {nextEvent ? (
                <View style={s.eventDetails}>
                  <Text style={s.eventTitle}>{nextEvent.title}</Text>
                  <Text style={s.eventCategory}>{nextEvent.category}</Text>
                  
                  <View style={s.eventRow}>
                    <Ionicons name="time-outline" size={n(16)} color={theme.text.secondary} />
                    <Text style={s.eventText}>
                      {new Date(nextEvent.from).toLocaleDateString()} {nextEvent.fromTime ? `at ${nextEvent.fromTime}` : ''}
                    </Text>
                  </View>
                  
                  <View style={s.eventRow}>
                    <Ionicons name="location-outline" size={n(16)} color={theme.text.secondary} />
                    <Text style={s.eventText}>{nextEvent.placeName}</Text>
                  </View>
                </View>
              ) : (
                <Text style={s.modalSubtitle}>No event selected.</Text>
              )}
            </View>
          </View>
        </Modal>

      </Animated.View>
    </View>
  );
}

const useStyles = (n, theme) => StyleSheet.create({
  desktopWrapper: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#000', // Deep black for desktop letterboxing
  },
  root: {
    flex: 1,
    minHeight: 0,
    backgroundColor: theme.bg.root,
    position: 'relative',
  },
  wallpaper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.bg.canvas,
    overflow: 'hidden',
    zIndex: 0,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    ...Platform.select({ web: { filter: `blur(${n(80)}px)` } }),
  },
  osShell: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    zIndex: 1,
  },
  
  /* Dynamic Island */
  islandWrapper: {
    alignItems: 'center',
    zIndex: 10,
  },
  dynamicIsland: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bg.card,
    borderWidth: theme.border?.width ?? StyleSheet.hairlineWidth,
    borderColor: theme.border.default,
    paddingVertical: n(10),
    paddingHorizontal: n(16),
    borderRadius: theme.shape?.cardRadius ?? n(99),
    gap: n(8),
    ...(theme.shadow?.card || {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    }),
  },
  islandDot: {
    width: n(6),
    height: n(6),
    borderRadius: n(3),
    backgroundColor: '#34C759',
    shadowColor: '#34C759',
    shadowOpacity: 0.8,
    shadowRadius: n(6),
    shadowOffset: { width: 0, height: 0 },
  },
  islandText: {
    color: theme.text.primary,
    fontSize: n(12),
    fontWeight: '600',
    fontFamily: theme.typography?.fontFamily || defaultFont,
    letterSpacing: 0.3,
  },
  doneButton: {
    position: 'absolute',
    right: n(20),
    top: n(20),
    backgroundColor: theme.bg.panel,
    borderWidth: theme.border?.width ?? StyleSheet.hairlineWidth,
    borderColor: theme.border.subtle,
    paddingHorizontal: n(12),
    paddingVertical: n(6),
    borderRadius: n(16),
  },
  doneButtonText: {
    color: theme.text.primary,
    fontSize: n(12),
    fontWeight: '700',
    fontFamily: theme.typography?.fontFamily || defaultFont,
  },

  /* Content */
  tabKeep: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  tabHidden: {
    display: 'none',
  },
  scrollContent: {
    paddingHorizontal: n(20),
    paddingTop: n(32),
    paddingBottom: n(120), // space for dock
  },

  /* Widgets */
  widgetSection: {
    gap: n(16),
    marginBottom: n(32),
  },
  widgetLarge: {
    borderRadius: theme.shape?.cardRadius ?? n(24),
    padding: n(20),
    borderWidth: theme.border?.width ?? StyleSheet.hairlineWidth,
    borderColor: theme.border.default,
    backgroundColor: theme.bg.card,
    ...(theme.shadow?.card || {}),
  },
  widgetSmall: {
    borderRadius: theme.shape?.cardRadius ?? n(24),
    padding: n(16),
    width: '48%', // Half width approximation
    borderWidth: theme.border?.width ?? StyleSheet.hairlineWidth,
    borderColor: theme.border.default,
    backgroundColor: theme.bg.card,
    ...(theme.shadow?.card || {}),
  },
  widgetSubtitle: {
    color: theme.text.secondary,
    fontSize: n(13),
    fontWeight: '600',
    fontFamily: theme.typography?.fontFamily || defaultFont,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: n(4),
  },
  widgetTitle: {
    color: theme.text.primary,
    fontSize: n(22),
    fontWeight: '700',
    fontFamily: theme.typography?.fontFamily || defaultFont,
    letterSpacing: -0.5,
    marginBottom: n(16),
    ...(theme.typography?.textShadow || {}),
  },
  widgetTitleSmall: {
    color: theme.text.primary,
    fontSize: n(16),
    fontWeight: '700',
    fontFamily: theme.typography?.fontFamily || defaultFont,
    letterSpacing: -0.3,
    ...(theme.typography?.textShadow || {}),
  },
  ctaButton: {
    backgroundColor: theme.text.accent,
    paddingVertical: n(14),
    borderRadius: theme.shape?.cardRadius ?? n(16),
    alignItems: 'center',
  },
  ctaButtonText: {
    color: theme.text.buttonText || (theme.isDark ? '#000000' : '#FFFFFF'),
    fontSize: n(15),
    fontWeight: '700',
    fontFamily: theme.typography?.fontFamily || defaultFont,
  },

  /* App Grid */
  appGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: n(24),
  },
  appIconWrapper: {
    width: '25%', // 4 columns
    alignItems: 'center',
    gap: n(6),
  },
  appIcon: {
      width: n(60),
      height: n(60),
      borderRadius: theme.shape?.iconRadius ?? n(16),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: n(6),
      borderWidth: theme.border?.width ?? 0,
      borderColor: theme.border.default,
      overflow: 'hidden',
      ...(theme.shadow?.icon || {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: n(4) },
        shadowOpacity: 0.3,
        shadowRadius: n(8),
      }),
    },
    deleteBadge: {
      position: 'absolute',
      top: n(-8),
      left: n(-6),
      width: n(24),
      height: n(24),
      borderRadius: n(12),
      backgroundColor: '#D1D1D6',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: n(20),
    },
    modalCard: {
      backgroundColor: theme.bg.panel,
      borderRadius: n(24),
      padding: n(24),
      width: '100%',
      maxWidth: 320,
      borderWidth: 1,
      borderColor: theme.border.subtle,
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: n(18),
      fontWeight: '700',
      color: theme.text.primary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      marginBottom: n(8),
      textAlign: 'center',
    },
    modalSubtitle: {
      fontSize: n(14),
      color: theme.text.secondary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      textAlign: 'center',
      marginBottom: n(24),
      lineHeight: n(20),
    },
    modalActions: {
      flexDirection: 'row',
      gap: n(12),
      width: '100%',
    },
    modalBtn: {
      flex: 1,
      paddingVertical: n(14),
      borderRadius: n(12),
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalBtnCancel: {
      backgroundColor: theme.bg.card,
      borderWidth: 1,
      borderColor: theme.border.default,
    },
    modalBtnDelete: {
      backgroundColor: theme.text.danger || '#FF3B30',
    },
    modalBtnText: {
      fontSize: n(15),
      fontWeight: '700',
      color: theme.text.primary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    modalBtnTextDelete: {
      color: '#FFF',
    },
    eventModalCard: {
      backgroundColor: theme.bg.panel,
      borderRadius: n(24),
      padding: n(24),
      width: '100%',
      maxWidth: 360,
      borderWidth: 1,
      borderColor: theme.border.subtle,
    },
    eventModalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: n(16),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border.subtle,
      paddingBottom: n(12),
    },
    eventDetails: {
      gap: n(12),
    },
    eventTitle: {
      fontSize: n(20),
      fontWeight: '800',
      color: theme.text.primary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      lineHeight: n(24),
    },
    eventCategory: {
      fontSize: n(13),
      color: theme.text.accent || theme.text.primary,
      fontWeight: '600',
      fontFamily: theme.typography?.fontFamily || defaultFont,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    eventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: n(8),
    },
    eventText: {
      fontSize: n(15),
      color: theme.text.secondary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
  appIconSelected: {
    borderWidth: n(3),
    borderColor: theme.text.primary,
    opacity: 0.8,
  },
  appIconLogoShell: {
    backgroundColor: '#000000',
    padding: 0,
  },
  appIconLogo: {
    width: '100%',
    height: '100%',
  },
  appIconImage: {
    width: '75%',
    height: '75%',
    borderRadius: n(4),
  },
  appLabel: {
    color: theme.text.primary,
    fontSize: n(11),
    fontWeight: '500',
    fontFamily: theme.typography?.fontFamily || defaultFont,
    textAlign: 'center',
    ...(theme.typography?.textShadow || {}),
  },

  /* System Dock */
  dockWrapper: {
    position: 'absolute',
    bottom: n(24),
    left: n(20),
    right: n(20),
    alignItems: 'center',
    zIndex: 20,
    pointerEvents: 'box-none',
  },
  dock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: n(400),
    borderRadius: n(32),
    paddingVertical: n(16),
    paddingHorizontal: n(16),
  },
  dockBtn: {
    width: n(44),
    height: n(44),
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Mini App Canvas */
  canvasWrap: {
    flex: 1,
    minHeight: 0,
    backgroundColor: theme.bg.canvas,
    zIndex: 999,
  },
  exitCapsule: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: theme.text.primary, // Inverted high-contrast solid background
    borderWidth: theme.border?.width ?? StyleSheet.hairlineWidth,
    borderColor: theme.text.primary,
    width: n(36), // Increased size
    height: n(36),
    borderRadius: n(18),
    alignItems: 'center',
    justifyContent: 'center',
    ...(theme.shadow?.card || {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 6,
      elevation: 5,
    }),
  },
  perfectCrossLine: {
    position: 'absolute',
    width: n(16), // Scaled up to match new capsule size
    height: n(2.5),
    backgroundColor: theme.bg.root, // Inverted high-contrast cross line
    borderRadius: n(1.5),
  },
});
