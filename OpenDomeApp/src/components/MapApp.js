import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, Pressable } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSmartSize } from '../providers/smartProvider';
import { useTheme } from '../providers/ThemeProvider';

import 'ol/ol.css';
import Map from 'ol/Map';
import ViewOL from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Style, Icon as OlIcon } from 'ol/style';

export default function MapApp() {
  const { normalize: n } = useSmartSize();
  const { colors: theme, themeId } = useTheme();

  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const [coords, setCoords] = useState(null);
  const [isFine, setIsFine] = useState(false);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('prompt');
  const watchId = useRef(null);

  const defaultFont = Platform.select({
    ios: 'System',
    web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
    default: 'sans-serif',
  });

  const requestPermission = async () => {
    try {
      setError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      if (status === 'granted') {
        fetchLocation();
      }
    } catch (e) {
      setError(e.message);
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
    }
  };

  const fetchLocation = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setPermissionStatus(status);
    
    if (status !== 'granted') {
      setError("Geolocation Required");
      return;
    }

    try {
      setError(null);
      if (isFine) {
        if (watchId.current) {
          watchId.current.remove();
          watchId.current = null;
        }
        watchId.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000 },
          (pos) => {
            setCoords(pos.coords);
            setPermissionStatus('granted');
            setError(null);
          }
        );
      } else {
        if (watchId.current) { 
          watchId.current.remove(); 
          watchId.current = null; 
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords(pos.coords);
        setPermissionStatus('granted');
      }
    } catch (e) {
      setError(`SYS_ERROR: ${e.message}`);
    }
  };

  useEffect(() => {
    fetchLocation();
    return () => { if (watchId.current) watchId.current.remove(); };
  }, [isFine]);

  const markerFeature = useRef(new Feature());

  // Initialize Map Once
  useEffect(() => {
    if (!mapElement.current || Platform.OS !== 'web') return;

    const vectorSource = new VectorSource({ features: [markerFeature.current] });
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        image: new OlIcon({
          anchor: [0.5, 1],
          src: 'https://openlayers.org/en/latest/examples/data/icon.png',
          scale: 1,
        }),
      }),
    });

    const map = new Map({
      target: mapElement.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        vectorLayer
      ],
      view: new ViewOL({
        center: fromLonLat([0, 0]),
        zoom: 2,
      }),
      controls: [], // Hide default controls for a cleaner UI
    });

    mapRef.current = map;
    return () => { map.setTarget(null); mapRef.current = null; };
  }, []);

  // Update Map View & Marker when coords change
  useEffect(() => {
    if (coords && mapRef.current) {
      const projCoords = fromLonLat([coords.longitude, coords.latitude]);
      markerFeature.current.setGeometry(new Point(projCoords));
      mapRef.current.getView().animate({ center: projCoords, zoom: isFine ? 18 : 14, duration: 1000 });
    }
  }, [coords, isFine]);

  const getMapFilter = () => {
    switch (themeId) {
      case 'synthwave':
      case 'deep_space':
      case 'dark':
        // Standard dark mode map (preserves some original OSM color tinting)
        return 'invert(100%) hue-rotate(180deg) contrast(110%) brightness(90%)';
      case 'pastel':
        // Soft pastel wash
        return 'saturate(0.5) sepia(0.4) hue-rotate(320deg) contrast(0.9) brightness(1.1)';
      case 'alpine':
        // Cool blue frost
        return 'saturate(0.4) sepia(0.5) hue-rotate(180deg) contrast(1.1) brightness(1.2)';

      case 'light':
      default:
        return 'none';
    }
  };

  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg.canvas,
      overflow: 'hidden',
    },
    hudContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      padding: n(16),
      paddingTop: Math.max(n(20), n(40)),
    },
    hudCard: {
      backgroundColor: theme.bg.card,
      borderRadius: theme.shape?.cardRadius ?? n(20),
      padding: n(16),
      borderWidth: 1,
      borderColor: theme.border.subtle,
      ...(theme.shadow?.card || {}),
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: n(12),
    },
    title: {
      color: theme.text.primary,
      fontSize: n(13),
      fontWeight: '800',
      letterSpacing: 1.2,
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    accBtn: {
      backgroundColor: isFine ? (theme.text.accent || '#34C759') : theme.bg.panel,
      paddingHorizontal: n(12),
      paddingVertical: n(6),
      borderRadius: n(12),
      borderWidth: 1,
      borderColor: isFine ? 'transparent' : theme.border.subtle,
    },
    accText: {
      color: isFine ? '#FFFFFF' : theme.text.primary,
      fontSize: n(10),
      fontWeight: '700',
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    coordText: {
      color: theme.text.secondary,
      fontSize: n(11),
      fontFamily: theme.typography?.fontFamilyCode || 'monospace',
    },
    errorRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: n(8),
    },
    errorText: {
      color: theme.status?.danger || '#FF3B30',
      fontSize: n(11),
      flex: 1,
      fontFamily: theme.typography?.fontFamilyCode || 'monospace',
    },
    retryBtn: {
      backgroundColor: theme.text.primary,
      paddingHorizontal: n(12),
      paddingVertical: n(6),
      borderRadius: n(12),
    },
    retryText: {
      color: theme.bg.card,
      fontSize: n(10),
      fontWeight: '800',
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    mapWrap: {
      flex: 1,
      width: '100%',
    },
    mapElement: {
      flex: 1,
      width: '100%',
      ...Platform.select({
        web: { filter: getMapFilter() },
        default: {}
      })
    },
    permissionOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.bg.canvas,
      justifyContent: 'center',
      alignItems: 'center',
      padding: n(32),
      zIndex: 200,
    },
    permIcon: {
      marginBottom: n(24),
    },
    permTitle: {
      color: theme.text.primary,
      fontSize: n(16),
      fontWeight: '800',
      letterSpacing: 0.5,
      marginBottom: n(12),
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    permDesc: {
      color: theme.text.secondary,
      fontSize: n(13),
      textAlign: 'center',
      lineHeight: n(20),
      marginBottom: n(32),
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    permBtn: {
      backgroundColor: theme.text.primary,
      paddingHorizontal: n(24),
      paddingVertical: n(14),
      borderRadius: n(16),
    },
    permBtnText: {
      color: theme.bg.card,
      fontSize: n(13),
      fontWeight: '800',
      fontFamily: theme.typography?.fontFamily || defaultFont,
    }
  });

  return (
    <View style={s.container}>
      {/* OS Premium HUD */}
      <View style={s.hudContainer}>
        <View style={s.hudCard}>
          <View style={s.headerRow}>
            <Text style={s.title}>LOCATION</Text>
            <Pressable
              style={s.accBtn}
              onPress={async () => {
                if (!isFine) {
                  const { status } = await Location.getForegroundPermissionsAsync();
                  if (status !== 'granted') {
                    await requestPermission();
                    const newStatus = await Location.getForegroundPermissionsAsync();
                    if (newStatus.status === 'granted') setIsFine(true);
                  } else {
                    setIsFine(true);
                  }
                } else {
                  setIsFine(false);
                }
              }}
            >
              <Text style={s.accText}>{isFine ? 'HIGH ACC' : 'LOW ACC'}</Text>
            </Pressable>
          </View>
          {coords ? (
            <Text style={s.coordText}>
              [{coords.latitude?.toFixed(4)}, {coords.longitude?.toFixed(4)}] • ACC: {(coords.accuracy || 0).toFixed(0)}m
            </Text>
          ) : (
            <View style={s.errorRow}>
              <Text style={s.errorText}>{error || 'LOCATING...'}</Text>
              <Pressable style={s.retryBtn} onPress={fetchLocation}>
                <Text style={s.retryText}>RETRY</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Permission Block */}
      {permissionStatus !== 'granted' && isFine && (
        <View style={s.permissionOverlay}>
          <Ionicons name="location" size={n(48)} color={theme.text.primary} style={s.permIcon} />
          <Text style={s.permTitle}>LOCATION REQUIRED</Text>
          <Text style={s.permDesc}>
            This core app requires geolocation access to plot your position on the map accurately.
          </Text>
          <Pressable style={s.permBtn} onPress={requestPermission}>
            <Text style={s.permBtnText}>ALLOW ACCESS</Text>
          </Pressable>
        </View>
      )}

      {/* OpenLayers Map Canvas */}
      <View style={[s.mapWrap, { display: permissionStatus === 'granted' ? 'flex' : 'none' }]}>
        <View ref={mapElement} style={s.mapElement} />
      </View>
    </View>
  );
}
