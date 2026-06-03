import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Communication, useOpenDome } from 'opendome';
import { GLOBAL_STYLES } from '../theme';

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
      {/* Topic badge */}
      {log.topic && (
        <Text style={{ color: tokens.NEON_SUCCESS, fontSize: 8, fontFamily: GLOBAL_STYLES.monospace, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 6 }}>
          ▶ {log.topic}
        </Text>
      )}
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

export default function CommunicationView({ theme, tokens }) {
  const isDark = theme === 'dark';
  const { context, user } = useOpenDome();
  
  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('OFFLINE');
  const [logs, setLogs] = useState([]);
  const [lastError, setLastError] = useState(null);
  const [channelType, setChannelType] = useState('app'); // 'app' or 'public'
  const [subtopic, setSubtopic] = useState('events'); // default subtopic name

  useEffect(() => {
    console.log('[CommunicationView] Context Update:', { 
      hasJwt: !!context?.wsJwt, 
      status, 
      contextKeys: context ? Object.keys(context) : [] 
    });
    if (status === 'OFFLINE' && context?.wsJwt) {
      connect();
    }
  }, [context]);

  const handleIncomingMessage = (data, resolvedTopic) => {
    let parsed = data;
    if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data);
      } catch (e) {
        parsed = { title: 'Raw Broadcast', content: data, sender: 'MQTT_BROKER' };
      }
    }

    if (parsed && (parsed.title || parsed.content || parsed.text)) {
      const content = parsed.content || parsed.text || '';
      const title = parsed.title || 'Message';
      const sender = parsed.sender || 'EXTERNAL';

      setLogs(prev => {
        const isDuplicate = prev.some(log =>
          log.title === title &&
          log.content === content &&
          log.sender === sender
        );
        if (isDuplicate) return prev;

        return [{
          id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
          sender,
          title,
          content,
          topic: resolvedTopic || null,
          time: new Date().toLocaleTimeString()
        }, ...prev];
      });
    }
  };

  const connect = () => {
    const jwt = context?.wsJwt;
    if (!jwt) return;

    try {
      setLastError(null);
      console.log('[CommunicationView] Initializing connection with JWT...');
      const client = Communication.connect({ jwt });

      // If already connected (e.g. from a previous instance)
      if (client.connected) {
        setStatus('CONNECTED');
        // Subscribe to the public ecosystem channel
        Communication.subscribe(Communication.PUBLIC_CHANNEL, handleIncomingMessage);
        // Subscribe to this app's namespace wildcard (opendome/appid/#)
        Communication.subscribe('#', handleIncomingMessage);
      }

      client.on('connect', () => {
        console.log('[CommunicationView] MQTT Connected Successfully');
        setStatus('CONNECTED');
        setLastError(null);
        Communication.subscribe(Communication.PUBLIC_CHANNEL, handleIncomingMessage);
        Communication.subscribe('#', handleIncomingMessage);
      });

      client.on('error', (err) => {
        console.error('[CommunicationView] MQTT Connection Error:', err);
        setLastError(err.message || 'Connection failed');
        setStatus('ERROR');
      });

      client.on('close', () => {
        console.warn('[CommunicationView] MQTT Connection Closed');
        setStatus('OFFLINE');
      });

      client.on('offline', () => {
        console.warn('[CommunicationView] MQTT Client Offline');
        setStatus('OFFLINE');
      });

    } catch (err) {
      console.error('[CommunicationView] Connect invocation failed:', err);
      setLastError(err.message);
      setStatus('OFFLINE');
    }
  };

  const publish = () => {
    if (!title.trim() || !message.trim()) return;

    if (!Communication.client) {
      console.error('[CommunicationView] SDK client not initialized. Retrying connection...');
      connect();
      return;
    }

    const sender = user?.username
      ? `@${user.username} · ${process.env.EXPO_PUBLIC_OD_APP_ID}`
      : process.env.EXPO_PUBLIC_OD_APP_ID;

    const payloadObj = { sender, title: title.trim(), content: message.trim() };

    try {
      // Determine target topic based on UI selection:
      // - public: goes to 'opendome/public'
      // - app: goes to custom subtopic (e.g. 'events', 'chat') which SDK prefixes automatically.
      const targetTopic = channelType === 'public'
        ? Communication.PUBLIC_CHANNEL
        : (subtopic.trim() || 'events');

      const resolvedTopic = Communication.publish(targetTopic, payloadObj);

      // Optimistic local echo so sender sees their own message instantly
      setLogs(prev => {
        const isDuplicate = prev.some(log =>
          log.title === payloadObj.title &&
          log.content === payloadObj.content &&
          log.sender === payloadObj.sender
        );
        if (isDuplicate) return prev;
        return [{
          id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
          sender: payloadObj.sender,
          title: payloadObj.title,
          content: payloadObj.content,
          topic: resolvedTopic,
          time: new Date().toLocaleTimeString()
        }, ...prev];
      });

      setTitle('');
      setMessage('');
    } catch (err) {
      console.error('[CommunicationView] Failed to publish:', err);
    }

  };

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: tokens.BG }} 
      contentContainerStyle={{ padding: 20, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      
      {/* Header Section */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ color: tokens.FG, fontSize: 16, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: 1, fontFamily: GLOBAL_STYLES.monospace }}>COMMS_TESTER</Text>
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
        <View style={{ flexDirection: 'row', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: GLOBAL_STYLES.monospace }}>SENDER:</Text>
          {user?.username && (
            <View style={{ backgroundColor: isDark ? '#0F2A1A' : '#D4F5E2', paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: tokens.NEON_SUCCESS }}>
              <Text style={{ color: tokens.NEON_SUCCESS, fontSize: 10, fontWeight: 'bold', fontFamily: GLOBAL_STYLES.monospace }}>@{user.username}</Text>
            </View>
          )}
          <View style={{ backgroundColor: isDark ? '#1A1A24' : '#E5E5EA', paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: GLOBAL_STYLES.monospace }}>{process.env.EXPO_PUBLIC_OD_APP_ID}</Text>
          </View>
        </View>

        {/* Destination Channel Selector */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              padding: 10,
              backgroundColor: channelType === 'app' ? tokens.NEON_PRIMARY : tokens.SURFACE,
              borderWidth: 1,
              borderColor: tokens.BORDER,
              alignItems: 'center'
            }}
            onPress={() => setChannelType('app')}
          >
            <Text style={{ color: channelType === 'app' ? '#000' : tokens.FG, fontSize: 10, fontFamily: GLOBAL_STYLES.monospace, fontWeight: 'bold' }}>
              APP SUBTOPIC
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              padding: 10,
              backgroundColor: channelType === 'public' ? tokens.NEON_PRIMARY : tokens.SURFACE,
              borderWidth: 1,
              borderColor: tokens.BORDER,
              alignItems: 'center'
            }}
            onPress={() => setChannelType('public')}
          >
            <Text style={{ color: channelType === 'public' ? '#000' : tokens.FG, fontSize: 10, fontFamily: GLOBAL_STYLES.monospace, fontWeight: 'bold' }}>
              PUBLIC CHANNEL
            </Text>
          </TouchableOpacity>
        </View>

        {channelType === 'app' && (
          <TextInput
            style={{
              padding: 12,
              fontSize: 12,
              backgroundColor: tokens.SURFACE,
              color: tokens.FG,
              borderWidth: 1,
              borderColor: tokens.BORDER,
              marginBottom: 12,
              fontFamily: GLOBAL_STYLES.monospace
            }}
            value={subtopic}
            onChangeText={setSubtopic}
            placeholder="Subtopic name (e.g. chat, events)"
            placeholderTextColor={tokens.MUTED}
          />
        )}

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
        
        <View style={{ paddingBottom: 40 }}>
          {logs.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center', borderWidth: 1, borderColor: tokens.BORDER, borderStyle: 'dashed' }}>
              <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: GLOBAL_STYLES.monospace }}>NO EVENTS TRANSMITTED</Text>
            </View>
          ) : (
            logs.map((log) => (
              <LogCard key={log.id} log={log} tokens={tokens} isDark={isDark} />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
