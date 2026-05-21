import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { Location } from 'opendome';
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
import { Style, Icon } from 'ol/style';
import { GLOBAL_STYLES } from '../theme';

export default function LocationView({ proxiedLocation, theme, tokens }) {
  const isDark = theme === 'dark';

  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const [coords, setCoords] = React.useState(null);
  const [isFine, setIsFine] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [permissionStatus, setPermissionStatus] = React.useState('prompt');
  const watchId = useRef(null);

  // Sync with proxied location from parent
  useEffect(() => {
    if (proxiedLocation) {
      setCoords(proxiedLocation);
      setPermissionStatus('granted');
    }
  }, [proxiedLocation]);

  const requestPermission = async () => {
    try {
      setError(null);
      await Location.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
      const status = await Location.checkPermission();
      setPermissionStatus(status);
      fetchLocation();
    } catch (e) {
      setError(e.message);
      const status = await Location.checkPermission();
      setPermissionStatus(status);
    }
  };

  const fetchLocation = async () => {
    if (proxiedLocation) {
      if (watchId.current) {
        Location.clearWatch(watchId.current);
        watchId.current = null;
      }
      return;
    }

    const status = await Location.checkPermission();
    setPermissionStatus(status);
    
    if (status !== 'granted' && status !== 'unknown') {
      setError("UPLINK_DENIED: Geolocation Required");
      return;
    }

    try {
      setError(null);
      if (isFine) {
        if (watchId.current) Location.clearWatch(watchId.current);
        watchId.current = Location.watchPosition(
          (pos) => {
            setCoords(pos);
            setPermissionStatus('granted');
            setError(null);
          },
          (err) => setError(`SIGNAL_LOST: ${err.message}`),
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
        );
      } else {
        if (watchId.current) { Location.clearWatch(watchId.current); watchId.current = null; }
        const pos = await Location.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
        setCoords(pos);
        setPermissionStatus('granted');
      }
    } catch (e) {
      setError(`SYS_ERROR: ${e.message}`);
    }
  };

  useEffect(() => {
    fetchLocation();
    return () => { if (watchId.current) Location.clearWatch(watchId.current); };
  }, [isFine]);

  const markerFeature = useRef(new Feature());

  // Initialize Map Once
  useEffect(() => {
    if (!mapElement.current || Platform.OS !== 'web') return;

    const vectorSource = new VectorSource({ features: [markerFeature.current] });
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        image: new Icon({
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

  return (
    <View style={{ flex: 1, backgroundColor: tokens.BG }}>
      {/* Info Box */}
      <View style={{ padding: 20, borderBottomWidth: 2, borderBottomColor: tokens.BORDER, backgroundColor: tokens.SURFACE }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: tokens.FG, fontSize: 11, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: 2, fontFamily: GLOBAL_STYLES.monospace }}>LOCATION TRACKER</Text>
          <TouchableOpacity
            style={{ backgroundColor: isFine ? tokens.NEON_SUCCESS : tokens.BG, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: tokens.BORDER }}
            onPress={async () => {
              if (!isFine) {
                // Requesting High Acc
                const status = await Location.checkPermission();
                if (status !== 'granted') {
                  await requestPermission();
                  const newStatus = await Location.checkPermission();
                  if (newStatus === 'granted') setIsFine(true);
                } else {
                  setIsFine(true);
                }
              } else {
                setIsFine(false);
              }
            }}
          >
            <Text style={{ color: isFine ? '#000' : tokens.FG, fontSize: 8, fontWeight: '900', fontFamily: GLOBAL_STYLES.monospace }}>{isFine ? 'HIGH ACC' : 'LOW ACC'}</Text>
          </TouchableOpacity>
        </View>
        {coords ? (
          <Text style={{ color: tokens.MUTED, fontSize: 9, fontFamily: GLOBAL_STYLES.monospace, marginTop: 4 }}>
            COORD: [{coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}] | ACC: {coords.accuracy.toFixed(1)}m
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ color: tokens.NEON_DANGER, fontSize: 9, fontFamily: GLOBAL_STYLES.monospace, flex: 1 }}>{error || 'LOCATING...'}</Text>
            <TouchableOpacity style={{ backgroundColor: tokens.NEON_DANGER, paddingHorizontal: 10, paddingVertical: 4 }} onPress={fetchLocation}>
              <Text style={{ color: '#FFF', fontSize: 8, fontWeight: '900', fontFamily: GLOBAL_STYLES.monospace }}>RETRY</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Permission prompt - Only blocking if isFine is requested and not granted */}
      {permissionStatus !== 'granted' && isFine && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, position: 'absolute', top: 100, left: 0, right: 0, bottom: 0, zIndex: 10, backgroundColor: tokens.BG }}>
          <Text style={{ fontSize: 48, marginBottom: 20 }}>📡</Text>
          <Text style={{ color: tokens.FG, fontSize: 13, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: 1, marginBottom: 10, fontFamily: GLOBAL_STYLES.monospace }}>LOCATION REQUIRED</Text>
          <Text style={{ color: tokens.MUTED, fontSize: 11, textAlign: 'center', lineHeight: 18, marginBottom: 30, fontFamily: GLOBAL_STYLES.monospace }}>
            This app needs geolocation access to display your position on the map.
          </Text>
          <TouchableOpacity style={{ backgroundColor: tokens.NEON_DANGER, paddingHorizontal: 24, paddingVertical: 16, borderWidth: 1, borderColor: tokens.FG }} onPress={requestPermission}>
            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900', fontFamily: GLOBAL_STYLES.monospace }}>ALLOW ACCESS</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Map */}
      <View style={{ flex: 1, width: '100%', display: permissionStatus === 'granted' ? 'flex' : 'none' }}>
        <View 
          ref={mapElement} 
          style={{ 
            flex: 1, 
            width: '100%',
            filter: isDark ? 'invert(100%) hue-rotate(180deg) contrast(120%)' : 'none' 
          }} 
        />
      </View>
    </View>
  );
}
