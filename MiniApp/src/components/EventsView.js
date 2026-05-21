import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Events, useOpenDome } from 'opendome';
import { GLOBAL_STYLES } from '../theme';

// Clean, animated log card component
const LogCard = ({ log, tokens, isDark }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={{ 
      opacity: fadeAnim, 
      backgroundColor: tokens.SURFACE, 
      padding: 16, 
      marginBottom: 12, 
      borderLeftWidth: 4, 
      borderLeftColor: tokens.NEON_PRIMARY,
      borderWidth: 1,
      borderColor: tokens.BORDER
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: tokens.NEON_PRIMARY, fontSize: 10, fontFamily: GLOBAL_STYLES.monospace, fontWeight: 'bold' }}>
          {log.sender}
        </Text>
        <Text style={{ color: tokens.MUTED, fontSize: 9, fontFamily: GLOBAL_STYLES.monospace }}>
          {log.time}
        </Text>
      </View>
      <Text style={{ color: tokens.FG, fontSize: 14, fontWeight: GLOBAL_STYLES.heavy, marginBottom: 4, fontFamily: GLOBAL_STYLES.monospace }}>
        {log.title}
      </Text>
      <Text style={{ color: tokens.MUTED, fontSize: 11, fontFamily: GLOBAL_STYLES.monospace, lineHeight: 16 }}>
        {log.content}
      </Text>
    </Animated.View>
  );
};

export default function EventsView({ theme, tokens }) {
  const isDark = theme === 'dark';
  const { context } = useOpenDome();
  
  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('OFFLINE');
  const [logs, setLogs] = useState([]);
  const [lastError, setLastError] = useState(null);

  useEffect(() => {
    console.log('[EventsView] Context Update:', { 
      hasJwt: !!context?.wsJwt, 
      status, 
      contextKeys: context ? Object.keys(context) : [] 
    });
    if (status === 'OFFLINE' && context?.wsJwt) {
      connect();
    }
  }, [context]);

  const connect = () => {
    const jwt = context?.wsJwt;
    if (!jwt) return;
    
    try {
      setLastError(null);
      console.log('[EventsView] Initializing connection with JWT...');
      const client = Events.connect({ jwt });
      
      // If already connected (e.g. from a previous instance)
      if (client.connected) {
        setStatus('CONNECTED');
        client.subscribe('opendome/public/events');
      }

      client.on('connect', () => {
        console.log('[EventsView] MQTT Connected Successfully');
        setStatus('CONNECTED');
        setLastError(null);
        client.subscribe('opendome/public/events');
      });

      client.on('error', (err) => {
        console.error('[EventsView] MQTT Connection Error:', err);
        setLastError(err.message || 'Connection failed');
        setStatus('ERROR');
      });

      client.on('close', () => {
        console.warn('[EventsView] MQTT Connection Closed');
        setStatus('OFFLINE');
      });

      client.on('offline', () => {
        console.warn('[EventsView] MQTT Client Offline');
        setStatus('OFFLINE');
      });

    } catch (err) {
      console.error('[EventsView] Connect invocation failed:', err);
      setLastError(err.message);
      setStatus('OFFLINE');
    }
  };

  const publish = () => {
    if (!title.trim() || !message.trim()) return;
    
    // Safety check: ensure SDK client is initialized
    if (!Events.client) {
      console.error('[EventsView] SDK client not initialized. Retrying connection...');
      connect();
      return;
    }

    // Create a structured payload for the Host
    const payloadObj = {
      sender: process.env.EXPO_PUBLIC_OD_APP_ID,
      title: title.trim(),
      content: message.trim()
    };
    
    try {
      Events.publish('opendome/public/events', JSON.stringify(payloadObj));
      
      // Update local logs
      setLogs(prev => [{ 
        id: Date.now().toString(), 
        ...payloadObj,
        time: new Date().toLocaleTimeString() 
      }, ...prev]);
      
      // Clear form
      setTitle('');
      setMessage('');
    } catch (err) {
      console.error("[EventsView] Failed to publish:", err);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.BG, padding: 20 }}>
      
      {/* Header Section */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ color: tokens.FG, fontSize: 16, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: 1, fontFamily: GLOBAL_STYLES.monospace }}>EVENT_TESTER</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ 
            width: 6, height: 6, borderRadius: 3, 
            backgroundColor: status === 'CONNECTED' ? tokens.NEON_SUCCESS : (status === 'ERROR' ? tokens.NEON_DANGER : tokens.MUTED),
            shadowColor: status === 'CONNECTED' ? tokens.NEON_SUCCESS : (status === 'ERROR' ? tokens.NEON_DANGER : 'transparent'), 
            shadowRadius: 4, shadowOpacity: 0.8
          }} />
          <Text style={{ color: tokens.MUTED, fontSize: 9, fontFamily: GLOBAL_STYLES.monospace, fontWeight: 'bold' }}>
            {status}
          </Text>
        </View>
      </View>

      {lastError && (
        <View style={{ backgroundColor: '#331111', padding: 10, marginBottom: 20, borderWidth: 1, borderColor: tokens.NEON_DANGER }}>
          <Text style={{ color: tokens.NEON_DANGER, fontSize: 9, fontFamily: GLOBAL_STYLES.monospace }}>ERROR: {lastError}</Text>
        </View>
      )}

      {/* Broadcaster Form */}
      <View style={{ marginBottom: 30 }}>
        
        {/* Read-Only Sender Tag */}
        <View style={{ flexDirection: 'row', marginBottom: 16, alignItems: 'center' }}>
          <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: GLOBAL_STYLES.monospace, marginRight: 8 }}>SENDER:</Text>
          <View style={{ backgroundColor: isDark ? '#1A1A24' : '#E5E5EA', paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: tokens.FG, fontSize: 10, fontWeight: 'bold', fontFamily: GLOBAL_STYLES.monospace }}>{process.env.EXPO_PUBLIC_OD_APP_ID}</Text>
          </View>
        </View>

        <TextInput
          style={{
            padding: 14,
            fontSize: 12,
            backgroundColor: tokens.SURFACE,
            color: tokens.FG,
            borderWidth: 1,
            borderColor: tokens.BORDER,
            marginBottom: 12,
            fontFamily: GLOBAL_STYLES.monospace
          }}
          value={title}
          onChangeText={setTitle}
          placeholder="Event Title (e.g. MISSION_COMPLETE)"
          placeholderTextColor={tokens.MUTED}
        />
        
        <TextInput
          style={{
            padding: 14,
            fontSize: 12,
            backgroundColor: tokens.SURFACE,
            color: tokens.FG,
            borderWidth: 1,
            borderColor: tokens.BORDER,
            marginBottom: 16,
            fontFamily: GLOBAL_STYLES.monospace,
            height: 80,
            textAlignVertical: 'top'
          }}
          value={message}
          onChangeText={setMessage}
          placeholder="Payload Message..."
          placeholderTextColor={tokens.MUTED}
          multiline
        />
        
        <TouchableOpacity
          style={{ 
            backgroundColor: (title && message && status === 'CONNECTED') ? tokens.NEON_DANGER : (isDark ? '#331111' : '#FFCCCC'), 
            padding: 16, 
            alignItems: 'center' 
          }}
          onPress={publish}
          disabled={!title || !message || status !== 'CONNECTED'}
        >
          <Text style={{ 
            color: (title && message && status === 'CONNECTED') ? '#FFF' : (isDark ? '#666' : '#FFF'), 
            fontSize: 11, 
            fontWeight: GLOBAL_STYLES.heavy, 
            letterSpacing: 1, 
            fontFamily: GLOBAL_STYLES.monospace 
          }}>
            {status === 'CONNECTED' ? 'BROADCAST PAYLOAD' : 'CONNECTING...'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Activity Log */}
      <View style={{ flex: 1 }}>
        <Text style={{ color: tokens.MUTED, fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12, fontFamily: GLOBAL_STYLES.monospace }}>RECENT_BROADCASTS</Text>
        
        <ScrollView showsVerticalScrollIndicator={false}>
          {logs.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center', borderWidth: 1, borderColor: tokens.BORDER, borderStyle: 'dashed' }}>
              <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: GLOBAL_STYLES.monospace }}>NO EVENTS TRANSMITTED</Text>
            </View>
          ) : (
            logs.map((log) => (
              <LogCard key={log.id} log={log} tokens={tokens} isDark={isDark} />
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}
