import React, { useEffect, useRef } from 'react';
import { Text, View, TouchableOpacity, Platform } from 'react-native';
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
import { GLOBAL_STYLES, isDarkTheme, onPrimaryColor } from '../theme';

const POSITION_OPTS = {
  coarse: { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
  fine: { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
};

export default function LocationView({ proxiedLocation, theme, tokens }) {
  const isDark = isDarkTheme(theme);
  const onPrimary = onPrimaryColor(theme);

  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const [coords, setCoords] = React.useState(null);
  const [isFine, setIsFine] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [permissionStatus, setPermissionStatus] = React.useState('prompt');
  const [requesting, setRequesting] = React.useState(false);
  const watchId = useRef(null);

  useEffect(() => {
    if (proxiedLocation) {
      setCoords(proxiedLocation);
      setPermissionStatus('granted');
      setError(null);
    }
  }, [proxiedLocation]);

  const clearWatch = () => {
    if (watchId.current != null) {
      Location.clearWatch(watchId.current);
      watchId.current = null;
    }
  };

  const requestPermission = async () => {
    if (proxiedLocation) return;
    setRequesting(true);
    setError(null);
    try {
      const pos = await Location.getCurrentPosition(POSITION_OPTS.coarse);
      setCoords(pos);
      setPermissionStatus('granted');
      setError(null);
    } catch (e) {
      const status = await Location.checkPermission().catch(() => 'denied');
      setPermissionStatus(status === 'granted' ? 'granted' : (status || 'denied'));
      setError(e.message || 'UPLINK_DENIED: Geolocation Required');
    } finally {
      setRequesting(false);
    }
  };

  const fetchLocation = async () => {
    if (proxiedLocation) {
      clearWatch();
      return;
    }

    const status = await Location.checkPermission().catch(() => 'unknown');
    setPermissionStatus(status);

    if (status !== 'granted') {
      if (status === 'denied') setError('UPLINK_DENIED: Geolocation Required');
      else setError(null);
      return;
    }

    try {
      setError(null);
      if (isFine) {
        clearWatch();
        watchId.current = Location.watchPosition(
          (pos) => {
            setCoords(pos);
            setPermissionStatus('granted');
            setError(null);
          },
          (err) => setError(`SIGNAL_LOST: ${err.message}`),
          POSITION_OPTS.fine
        );
      } else {
        clearWatch();
        const pos = await Location.getCurrentPosition(POSITION_OPTS.coarse);
        setCoords(pos);
        setPermissionStatus('granted');
      }
    } catch (e) {
      setError(`SYS_ERROR: ${e.message}`);
    }
  };

  useEffect(() => {
    fetchLocation();
    return () => clearWatch();
  }, [isFine]);

  const markerFeature = useRef(new Feature());
  const needsGrant = !proxiedLocation && permissionStatus !== 'granted' && !coords;

  useEffect(() => {
    if (needsGrant || !mapElement.current || Platform.OS !== 'web' || mapRef.current) return;

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
  }, [needsGrant]);

  useEffect(() => {
    if (coords && mapRef.current) {
      const projCoords = fromLonLat([coords.longitude, coords.latitude]);
      markerFeature.current.setGeometry(new Point(projCoords));
      mapRef.current.getView().animate({ center: projCoords, zoom: isFine ? 18 : 14, duration: 1000 });
    }
  }, [coords, isFine]);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.BG }}>
      <View style={{ padding: 20, borderBottomWidth: 2, borderBottomColor: tokens.BORDER, backgroundColor: tokens.SURFACE }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: tokens.FG, fontSize: 11, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: 2, fontFamily: tokens.font.primary }}>LOCATION TRACKER</Text>
          <TouchableOpacity
            style={{ backgroundColor: isFine ? tokens.NEON_SUCCESS : tokens.BG, paddingHorizontal: 12, paddingVertical: 6, borderWidth: tokens.shape.border, borderColor: tokens.BORDER, borderRadius: tokens.shape.buttonRadius }}
            onPress={async () => {
              if (!isFine) {
                const status = await Location.checkPermission().catch(() => 'prompt');
                if (status !== 'granted') {
                  await requestPermission();
                  const newStatus = await Location.checkPermission().catch(() => 'prompt');
                  if (newStatus === 'granted') setIsFine(true);
                } else {
                  setIsFine(true);
                }
              } else {
                setIsFine(false);
              }
            }}
          >
            <Text style={{ color: isFine ? '#000' : tokens.FG, fontSize: 8, fontWeight: '900', fontFamily: tokens.font.primary }}>{isFine ? 'HIGH ACC' : 'LOW ACC'}</Text>
          </TouchableOpacity>
        </View>

        {coords ? (
          <Text style={{ color: tokens.MUTED, fontSize: 9, fontFamily: tokens.font.mono, marginTop: 4 }}>
            COORD: [{coords.latitude?.toFixed(4)}, {coords.longitude?.toFixed(4)}] | ACC: {(coords.accuracy || 0).toFixed(1)}m
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ color: error ? tokens.NEON_DANGER : tokens.MUTED, fontSize: 9, fontFamily: tokens.font.mono, flex: 1 }}>
              {error || (requesting ? 'REQUESTING UPLINK...' : 'GEOLOCATION REQUIRED')}
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: tokens.NEON_PRIMARY, paddingHorizontal: 10, paddingVertical: 4, borderRadius: tokens.shape.buttonRadius }}
              onPress={requestPermission}
              disabled={requesting}
            >
              <Text style={{ color: onPrimary, fontSize: 8, fontWeight: '900', fontFamily: tokens.font.primary }}>
                {requesting ? 'WAIT' : 'RETRY'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {needsGrant ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: tokens.BG }}>
          <Text style={{ fontSize: 48, marginBottom: 20 }}>📡</Text>
          <Text style={{ color: tokens.FG, fontSize: 13, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: 1, marginBottom: 10, fontFamily: tokens.font.primary }}>LOCATION REQUIRED</Text>
          <Text style={{ color: tokens.MUTED, fontSize: 11, textAlign: 'center', lineHeight: 18, marginBottom: 30, fontFamily: tokens.font.mono }}>
            {permissionStatus === 'denied'
              ? 'Location is blocked for this mini app. Enable geolocation for this site in the browser, then tap Allow Access.'
              : 'This app needs geolocation access to display your position on the map.'}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: tokens.NEON_PRIMARY, paddingHorizontal: 24, paddingVertical: 16, borderWidth: tokens.shape.border, borderColor: tokens.FG, borderRadius: tokens.shape.buttonRadius }}
            onPress={requestPermission}
            disabled={requesting}
          >
            <Text style={{ color: onPrimary, fontSize: 10, fontWeight: '900', fontFamily: tokens.font.primary }}>
              {requesting ? 'REQUESTING...' : 'ALLOW ACCESS'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1, width: '100%' }}>
          <View
            ref={mapElement}
            style={{
              flex: 1,
              width: '100%',
              filter: isDark ? 'invert(100%) hue-rotate(180deg) contrast(120%)' : 'none'
            }}
          />
        </View>
      )}
    </View>
  );
}
