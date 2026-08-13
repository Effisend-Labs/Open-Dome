import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Communication, useOpenDome } from 'opendome';
import { GLOBAL_STYLES } from '../theme';
import { boxShadow } from '../utils/styleCompat';

  const LogCard = ({ log, tokens, isDark }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start();
  }, []);

  return (
    <Animated.View style={{
      opacity: fadeAnim,
      backgroundColor: tokens.SURFACE,
      padding: 16,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: tokens.NEON_PRIMARY,
      borderWidth: tokens.shape.border,
      borderColor: tokens.BORDER,
      borderRadius: tokens.shape.cardRadius,
      ...tokens.shadow.card
    }}>
      {/* Topic badge */}
      {log.topic && (
        <Text style={{ color: tokens.NEON_SUCCESS, fontSize: 8, fontFamily: tokens.font.mono, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 6 }}>
          ▶ {log.topic}
        </Text>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: tokens.NEON_PRIMARY, fontSize: 10, fontFamily: tokens.font.mono, fontWeight: 'bold' }}>
          {log.sender}
        </Text>
        <Text style={{ color: tokens.MUTED, fontSize: 9, fontFamily: tokens.font.mono }}>
          {log.time}
        </Text>
      </View>
      <Text style={{ color: tokens.FG, fontSize: 14, fontWeight: GLOBAL_STYLES.heavy, marginBottom: 4, fontFamily: tokens.font.primary }}>
        {log.title}
      </Text>
      <Text style={{ color: tokens.MUTED, fontSize: 11, fontFamily: tokens.font.mono, lineHeight: 16 }}>
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
        <Text style={{ color: tokens.FG, fontSize: 16, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: 1, fontFamily: tokens.font.primary }}>COMMS_TESTER</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ 
            width: 6, height: 6, borderRadius: 3, 
            backgroundColor: status === 'CONNECTED' ? tokens.NEON_SUCCESS : (status === 'ERROR' ? tokens.NEON_DANGER : tokens.MUTED),
            ...boxShadow({
              color: status === 'CONNECTED' ? (tokens.NEON_SUCCESS || '#00D897') : (status === 'ERROR' ? (tokens.NEON_DANGER || '#EF4444') : 'transparent'),
              offsetY: 0,
              blur: 4,
              opacity: 0.8,
              elevation: 0,
            }),
          }} />
          <Text style={{ color: tokens.MUTED, fontSize: 9, fontFamily: tokens.font.mono, fontWeight: 'bold' }}>
            {status}
          </Text>
        </View>
      </View>

      {lastError && (
        <View style={{ backgroundColor: '#331111', padding: 10, marginBottom: 20, borderWidth: tokens.shape.border, borderColor: tokens.NEON_DANGER, borderRadius: tokens.shape.cardRadius / 2 }}>
          <Text style={{ color: tokens.NEON_DANGER, fontSize: 9, fontFamily: tokens.font.mono }}>ERROR: {lastError}</Text>
        </View>
      )}

      {/* Broadcaster Form */}
      <View style={{ marginBottom: 30 }}>
        
        {/* Read-Only Sender Tag */}
        <View style={{ flexDirection: 'row', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: tokens.font.primary }}>SENDER:</Text>
          {user?.username && (
            <View style={{ backgroundColor: isDark ? '#0F2A1A' : '#D4F5E2', paddingHorizontal: 8, paddingVertical: 4, borderWidth: tokens.shape.border, borderColor: tokens.NEON_SUCCESS, borderRadius: tokens.shape.pillRadius }}>
              <Text style={{ color: tokens.NEON_SUCCESS, fontSize: 10, fontWeight: 'bold', fontFamily: tokens.font.mono }}>@{user.username}</Text>
            </View>
          )}
          <View style={{ backgroundColor: isDark ? '#1A1A24' : '#E5E5EA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: tokens.shape.pillRadius }}>
            <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: tokens.font.mono }}>{process.env.EXPO_PUBLIC_OD_APP_ID}</Text>
          </View>
        </View>

        {/* Destination Channel Selector */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              padding: 10,
              backgroundColor: channelType === 'app' ? tokens.NEON_PRIMARY : tokens.SURFACE,
              borderWidth: tokens.shape.border,
              borderColor: tokens.BORDER,
              alignItems: 'center',
              borderRadius: tokens.shape.buttonRadius
            }}
            onPress={() => setChannelType('app')}
          >
            <Text style={{ color: channelType === 'app' ? '#000' : tokens.FG, fontSize: 10, fontFamily: tokens.font.primary, fontWeight: 'bold' }}>
              APP SUBTOPIC
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              padding: 10,
              backgroundColor: channelType === 'public' ? tokens.NEON_PRIMARY : tokens.SURFACE,
              borderWidth: tokens.shape.border,
              borderColor: tokens.BORDER,
              alignItems: 'center',
              borderRadius: tokens.shape.buttonRadius
            }}
            onPress={() => setChannelType('public')}
          >
            <Text style={{ color: channelType === 'public' ? '#000' : tokens.FG, fontSize: 10, fontFamily: tokens.font.primary, fontWeight: 'bold' }}>
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
              borderWidth: tokens.shape.border,
              borderColor: tokens.BORDER,
              marginBottom: 12,
              fontFamily: tokens.font.mono,
              borderRadius: tokens.shape.buttonRadius
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
            borderWidth: tokens.shape.border,
            borderColor: tokens.BORDER,
            marginBottom: 12,
            fontFamily: tokens.font.mono,
            borderRadius: tokens.shape.buttonRadius
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
            borderWidth: tokens.shape.border,
            borderColor: tokens.BORDER,
            marginBottom: 16,
            fontFamily: tokens.font.mono,
            height: 80,
            textAlignVertical: 'top',
            borderRadius: tokens.shape.buttonRadius
          }}
          value={message}
          onChangeText={setMessage}
          placeholder="Payload Message..."
          placeholderTextColor={tokens.MUTED}
          multiline
        />
        
        <TouchableOpacity
          style={{ 
            backgroundColor: (title && message && status === 'CONNECTED') ? tokens.NEON_PRIMARY : (isDark ? '#333' : '#E5E5EA'), 
            padding: 16, 
            alignItems: 'center',
            borderRadius: tokens.shape.buttonRadius
          }}
          onPress={publish}
          disabled={!title || !message || status !== 'CONNECTED'}
        >
          <Text style={{ 
            color: (title && message && status === 'CONNECTED') ? (isDark ? '#000' : '#FFF') : (isDark ? '#666' : '#999'), 
            fontSize: 11, 
            fontWeight: GLOBAL_STYLES.heavy, 
            letterSpacing: 1, 
            fontFamily: tokens.font.primary 
          }}>
            {status === 'CONNECTED' ? 'BROADCAST PAYLOAD' : 'CONNECTING...'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Activity Log */}
      <View style={{ flex: 1 }}>
        <Text style={{ color: tokens.MUTED, fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12, fontFamily: tokens.font.primary }}>RECENT_BROADCASTS</Text>
        
        <View style={{ paddingBottom: 40 }}>
          {logs.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center', borderWidth: tokens.shape.border, borderColor: tokens.BORDER, borderStyle: 'dashed', borderRadius: tokens.shape.cardRadius }}>
              <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: tokens.font.mono }}>NO EVENTS TRANSMITTED</Text>
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
