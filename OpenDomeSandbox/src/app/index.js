import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, Image } from 'react-native';
import SmartProvider from '../components/SmartProvider';
import EventBoard from '../components/EventBoard';
import LogoO from '../assets/logoP.png';

const verifyTokenOnServer = async (token) => {
  console.log(`[Open-Dome Sandbox Frontend] Calling Server API to verify token...`);
  try {
    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.valid) {
      return { token: data.token, wsJwt: data.wsJwt, hostJwt: data.hostJwt };
    }
    return null;
  } catch (err) {
    console.error('[Open-Dome Sandbox Frontend] API Server communication failed:', err.message);
    return null;
  }
};

export default function App() {
  const [url, setUrl] = useState('https://miniapp.expo.app');
  const [verifiedToken, setVerifiedToken] = useState(null);
  const [dynamicContext, setDynamicContext] = useState([
    { key: 'username', value: 'Altaga' },
    { key: 'theme', value: 'dark' },
    { key: 'lang', value: 'en' }
  ]);
  const [sdkStatus, setSdkStatus] = useState({
    detected: false,
    version: null,
    status: 'PENDING',
    error: null,
    context: {}
  });
  const [eventsConfig, setEventsConfig] = useState({ jwt: '' });
  const [activeUrl, setActiveUrl] = useState(null);
  const [isContextExpanded, setIsContextExpanded] = useState(true);
  const [isInjecting, setIsInjecting] = useState(false);

  const addContextRow = () => {
    setDynamicContext([...dynamicContext, { key: '', value: '' }]);
  };

  const updateContextRow = (index, field, val) => {
    const newContext = [...dynamicContext];
    newContext[index][field] = val;
    setDynamicContext(newContext);
  };

  const removeContextRow = (index) => {
    setDynamicContext(dynamicContext.filter((_, i) => i !== index));
  };

  // Listen for SDK signals
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'OPEN_DOME_SDK_INIT') {
        setSdkStatus({
          detected: true,
          version: event.data.version,
          status: event.data.status,
          error: null,
          context: event.data.context || {}
        });
      }

      if (event.data && event.data.type === 'OPEN_DOME_SDK_ERROR') {
        setSdkStatus(prev => ({
          ...prev,
          detected: true,
          status: 'UNAUTHORIZED',
          error: event.data.error
        }));
      }

      if (event.data && event.data.type === 'OPENDOME_READY') {
        const iframe = document.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
          const contextObj = {};
          dynamicContext.forEach(row => {
            if (row.key) contextObj[row.key] = row.value;
          });

          // Use the token the Mini App sent — verified against the server token list
          const miniAppToken = event.data.token || verifiedToken;
          console.log('[Open-Dome Sandbox] Received OPENDOME_READY with token:', miniAppToken ? 'present' : 'missing');

          verifyTokenOnServer(miniAppToken).then((res) => {
            if (res) {
              const { token, wsJwt } = res;
              console.log('[Open-Dome Sandbox Server API] Token verified. Sending Handshake.');
              iframe.contentWindow.postMessage({
                type: 'OPENDOME_HANDSHAKE',
                status: 'VERIFIED',
                payload: token,
                context: {
                  ...contextObj,
                  wsJwt
                }
              }, '*');
            } else {
              console.error('[Open-Dome Sandbox Server API] Token verification failed.');
              iframe.contentWindow.postMessage({
                type: 'OPENDOME_HANDSHAKE',
                status: 'UNAUTHORIZED',
                error: 'INVALID_TOKEN'
              }, '*');
            }
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [dynamicContext, verifiedToken]);

  // Location Proxy: Get location at parent level and send to iframe
  useEffect(() => {
    if (!activeUrl) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const iframe = document.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'OPENDOME_LOCATION_UPDATE',
            payload: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: pos.timestamp
            }
          }, '*');
        }
      },
      (err) => console.warn('[Open-Dome Parent] Location Proxy Error:', err.message),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeUrl]);


  const runTest = async () => {
    setIsInjecting(true);
    setSdkStatus({ detected: false, version: null, status: 'PENDING', error: null, context: {} });

    const res = await verifyTokenOnServer(verifiedToken);
    if (!res) {
      setSdkStatus(prev => ({
        ...prev,
        detected: true,
        status: 'UNAUTHORIZED',
        error: 'INVALID_TOKEN'
      }));
      setIsInjecting(false);
      return;
    }

    const { token, wsJwt, hostJwt } = res;
    setVerifiedToken(token);
    const pass = token;
    const proof = `SIG_${pass}_VERIFIED`;

    let extraQuery = '';
    dynamicContext.forEach(row => {
      if (row.key && row.value) {
        extraQuery += `&${row.key.trim()}=${row.value.trim()}`;
      }
    });

    const separator = url.includes('?') ? '&' : '?';
    setActiveUrl(`${url}${separator}pass=${pass}&proof=${proof}${extraQuery}&wsJwt=${wsJwt}`);

    // Connect Events Board on Inject using dynamic host JWT from verifier
    setEventsConfig({ jwt: hostJwt || '' });

    // Mock loading feedback
    setTimeout(() => setIsInjecting(false), 500);
  };

  return (
    <View style={styles.container}>
      {/* Swiss Lab Header */}
      <View style={styles.header}>
        <View style={styles.branding}>
          <Image source={LogoO} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brandSubtitle}>OPEN_DOME_MINI_APPS_SANDBOX</Text>
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.metaText}>V1.0.4</Text>
          <Text style={styles.metaText}>SYS_READY</Text>
        </View>
      </View>

      <View style={styles.workspace}>
        {/* Control Panel - Left */}
        <View style={styles.sidebar}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.controlSection}>
              <Text style={styles.sectionLabel}>CONFIGURATION</Text>

              <View style={styles.inputField}>
                <Text style={styles.inputLabel}>Endpoint URL</Text>
                <TextInput style={styles.input} value={url} onChangeText={setUrl} autoCapitalize="none" />
              </View>

              {/* Security token verification handled on server */}

              <View style={styles.inputField}>
                <TouchableOpacity
                  style={styles.collapsibleHeader}
                  onPress={() => setIsContextExpanded(!isContextExpanded)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.inputLabel}>CONTEXT_VARIABLES</Text>
                  <Text style={styles.expandIcon}>{isContextExpanded ? '▾' : '▸'}</Text>
                </TouchableOpacity>

                {isContextExpanded && (
                  <View style={styles.contextListContainer}>
                    <View style={styles.contextHeader}>
                      <Text style={styles.contextHeaderLabel}>NAME</Text>
                      <Text style={styles.contextHeaderLabel}>VARIABLE</Text>
                      <View style={{ width: 34 }} />
                    </View>
                    {dynamicContext.map((row, index) => (
                      <View key={index} style={styles.contextRow}>
                        <TextInput
                          style={[styles.input, styles.contextInput]}
                          value={row.key}
                          onChangeText={(val) => updateContextRow(index, 'key', val)}
                          placeholder="key"
                          placeholderTextColor="#86868B"
                        />
                        <TextInput
                          style={[styles.input, styles.contextInput]}
                          value={row.value}
                          onChangeText={(val) => updateContextRow(index, 'value', val)}
                          placeholder="value"
                          placeholderTextColor="#86868B"
                        />
                        <TouchableOpacity style={styles.removeButton} onPress={() => removeContextRow(index)} activeOpacity={0.6}>
                          <Text style={styles.removeButtonText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity style={styles.addButton} onPress={addContextRow} activeOpacity={0.6}>
                      <Text style={styles.addButtonText}>+ ADD VARIABLE</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Mini App JWT generated on demand on the server */}

              <TouchableOpacity
                style={[styles.runButton, isInjecting && { backgroundColor: '#005BB5' }]}
                onPress={runTest}
                activeOpacity={0.6}
                disabled={isInjecting}
              >
                <Text style={styles.runButtonText}>{isInjecting ? 'Injecting...' : 'Inject Payload'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Stage Area - Center (Mobile Smartphone View) */}
        <View style={styles.stage}>
          <SmartProvider>
            <View style={styles.sandboxContent}>
              {activeUrl ? (
                Platform.OS === 'web' ? (
                  <iframe src={activeUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Compatibility Test" allow="geolocation" />
                ) : (
                  <Text style={styles.errorText}>Web Environment Required</Text>
                )
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Ready.</Text>
                  <Text style={styles.emptyDesc}>Inject payload to start mobile verification.</Text>
                </View>
              )}
            </View>
          </SmartProvider>
        </View>

        {/* Validation Panel - Right */}
        <View style={styles.rightSidebar}>
          <View style={styles.validationSection}>
            <Text style={styles.sectionLabel}>VALIDATION_CHECKLIST</Text>

            <View style={styles.checkItem}>
              <View style={[
                styles.checkDot,
                { backgroundColor: activeUrl ? '#34C759' : '#444' },
                activeUrl && styles.checkDotActive
              ]} />
              <Text style={styles.checkLabel}>Token Injected</Text>
            </View>

            <View style={styles.checkItem}>
              <View style={[
                styles.checkDot,
                { backgroundColor: sdkStatus.detected ? '#34C759' : '#444' },
                sdkStatus.detected && styles.checkDotActive
              ]} />
              <Text style={styles.checkLabel}>open-dome SDK Detected</Text>
            </View>

            <View style={styles.checkItem}>
              <View style={[
                styles.checkDot,
                {
                  backgroundColor: sdkStatus.status === 'AUTHORIZED' ? '#34C759' : (sdkStatus.status === 'UNAUTHORIZED' ? '#FF3B30' : '#444')
                },
                sdkStatus.status === 'AUTHORIZED' && styles.checkDotActive,
                sdkStatus.status === 'UNAUTHORIZED' && styles.checkDotError
              ]} />
              <Text style={styles.checkLabel}>
                {sdkStatus.status === 'UNAUTHORIZED' ? 'Handshake Rejected' : 'Session Authorized'}
              </Text>
            </View>

            {sdkStatus.error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorLabel}>SECURITY_FAIL:</Text>
                <Text style={styles.errorMsg}>{sdkStatus.error}</Text>
              </View>
            )}

            {sdkStatus.detected && sdkStatus.status === 'AUTHORIZED' && (
              <View style={styles.contextReceipt}>
                <Text style={styles.receiptLabel}>RECEIVED_CONTEXT:</Text>
                {Object.entries(sdkStatus.context)
                  .filter(([k]) => k !== 'wsJwt')
                  .map(([k, v]) => (
                    <Text key={k} style={styles.receiptText}>{k}: {v}</Text>
                  ))}
              </View>
            )}
          </View>

          <View style={[styles.noticeSection, { flex: 1 }]}>
            <EventBoard config={eventsConfig} />
          </View>
        </View>

      </View>
    </View>
  );
}

const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7', fontFamily: APPLE_FONT },
  header: {
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    // @ts-ignore
    backdropFilter: 'blur(10px)',
    zIndex: 100,
  },
  branding: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 80, height: 60 },
  brandTitle: { fontSize: 18, fontWeight: '900', color: '#1D1D1F', letterSpacing: -0.5, fontFamily: APPLE_FONT },
  brandSubtitle: { paddingLeft: 10,fontSize: 9, fontWeight: '500', color: '#86868B', letterSpacing: 1, fontFamily: APPLE_FONT },
  headerMeta: { flexDirection: 'row', gap: 24 },
  metaText: { fontSize: 9, fontFamily: 'monospace', color: '#86868B' },
  workspace: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 380,
    padding: 30,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    zIndex: 1,
  },
  controlSection: { marginBottom: 64 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#86868B',
    marginBottom: 16,
    letterSpacing: 1.5,
    fontFamily: APPLE_FONT
  },
  inputField: { marginBottom: 24 },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#1D1D1F', marginBottom: 8, fontFamily: APPLE_FONT },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 13,
    color: '#000',
    borderRadius: 10,
    fontFamily: APPLE_FONT,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  runButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    borderRadius: 12,
  },
  runButtonText: { color: '#FFF', fontSize: 13, fontWeight: '600', fontFamily: APPLE_FONT },
  collapsibleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  expandIcon: { color: '#86868B', fontSize: 20, fontWeight: '900' },
  contextHeader: { flexDirection: 'row', marginBottom: 8, gap: 10 },
  contextHeaderLabel: { flex: 1, fontSize: 8, color: '#86868B', fontWeight: 'bold' },
  contextListContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  contextRow: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'center' },
  contextInput: { flex: 1, minWidth: 0, flexShrink: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 11 },
  addButton: {
    backgroundColor: 'transparent',
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: { color: '#007AFF', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, fontFamily: APPLE_FONT },
  removeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
    borderRadius: 16,
  },
  removeButtonText: { color: '#86868B', fontSize: 12, fontWeight: '600' },
  rightSidebar: {
    width: 380,
    padding: 40,
    backgroundColor: '#1C1C1E',
  },
  validationSection: { paddingTop: 0 },
  checkItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  checkDot: { width: 6, height: 6, marginRight: 12, borderRadius: 3 },
  checkDotActive: {
    shadowColor: '#34C759',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  checkDotError: {
    shadowColor: '#FF3B30',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  checkLabel: { fontSize: 12, color: '#FFFFFF', fontWeight: '500', fontFamily: APPLE_FONT },
  errorBanner: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#3A1D1D',
    borderRadius: 8,
  },
  errorLabel: { color: '#FF3B30', fontSize: 8, fontWeight: 'bold', marginBottom: 4, fontFamily: APPLE_FONT },
  errorMsg: { color: '#FF3B30', fontSize: 10, fontFamily: 'monospace' },
  contextReceipt: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
  },
  receiptLabel: { color: '#86868B', fontSize: 8, fontWeight: 'bold', marginBottom: 8, fontFamily: APPLE_FONT },
  receiptText: { color: '#34C759', fontSize: 10, fontFamily: 'monospace', marginBottom: 4 },
  noticeSection: { marginTop: 40, borderTopWidth: 0.5, borderTopColor: '#333', paddingTop: 40 },
  stage: { flex: 1, backgroundColor: '#F0F0F2' },
  sandboxContent: { flex: 1, backgroundColor: '#000' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: '#1D1D1F', marginBottom: 12, fontFamily: APPLE_FONT },
  emptyDesc: { fontSize: 14, color: '#86868B', textAlign: 'center', lineHeight: 20, maxWidth: 320, fontFamily: APPLE_FONT },
  errorText: { padding: 40, color: '#86868B', textAlign: 'center', fontFamily: APPLE_FONT },
});
