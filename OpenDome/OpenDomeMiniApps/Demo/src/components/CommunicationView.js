import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Text, View, TextInput, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Communication, useOpenDome } from 'opendome';
import { GLOBAL_STYLES, isDarkTheme, onPrimaryColor } from '../theme';

const LogCard = ({ log, tokens }) => {
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

function ChannelButton({ active, label, onPress, tokens, onPrimary }) {
  return (
    <TouchableOpacity
      style={{
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 10,
        backgroundColor: active ? tokens.NEON_PRIMARY : tokens.SURFACE,
        borderWidth: tokens.shape.border,
        borderColor: active ? tokens.NEON_PRIMARY : tokens.BORDER,
        alignItems: 'center',
        borderRadius: tokens.shape.buttonRadius,
      }}
      onPress={onPress}
    >
      <Text style={{
        color: active ? onPrimary : tokens.FG,
        fontSize: 10,
        fontFamily: tokens.font.primary,
        fontWeight: 'bold',
        letterSpacing: 0.6,
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function CommunicationView({ theme, tokens }) {
  const isDark = isDarkTheme(theme);
  const onPrimary = onPrimaryColor(theme);
  const { context, user } = useOpenDome();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('OFFLINE');
  const [logs, setLogs] = useState([]);
  const [lastError, setLastError] = useState(null);
  const [channelType, setChannelType] = useState('app');
  const [subtopic, setSubtopic] = useState('events');

  const handleIncomingMessage = useCallback((data, resolvedTopic) => {
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
      const eventTitle = parsed.title || 'Message';
      const sender = parsed.sender || 'EXTERNAL';

      setLogs(prev => {
        const isDuplicate = prev.some(log =>
          log.title === eventTitle &&
          log.content === content &&
          log.sender === sender
        );
        if (isDuplicate) return prev;

        return [{
          id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
          sender,
          title: eventTitle,
          content,
          topic: resolvedTopic || null,
          time: new Date().toLocaleTimeString()
        }, ...prev];
      });
    }
  }, []);

  const subscribeChannels = useCallback(() => {
    try {
      Communication.subscribe(Communication.PUBLIC_CHANNEL, handleIncomingMessage);
      Communication.subscribe('#', handleIncomingMessage);
    } catch (err) {
      console.warn('[CommunicationView] Subscribe failed:', err.message);
    }
  }, [handleIncomingMessage]);

  const connect = useCallback(() => {
    const jwt = context?.wsJwt;
    if (!jwt) {
      setLastError('Waiting for uplink token from host.');
      setStatus('OFFLINE');
      return;
    }

    try {
      setLastError(null);
      setStatus('CONNECTING');

      const client = Communication.connect({
        jwt,
        appId: process.env.EXPO_PUBLIC_OD_APP_ID,
      });

      if (client.connected) {
        setStatus('CONNECTED');
        subscribeChannels();
        return;
      }

      const onConnect = () => {
        setStatus('CONNECTED');
        setLastError(null);
        subscribeChannels();
      };
      const onError = (err) => {
        setLastError(err.message || 'Connection failed');
        setStatus('ERROR');
      };
      const onClose = () => {
        setStatus((prev) => (prev === 'ERROR' ? prev : 'OFFLINE'));
      };

      client.on('connect', onConnect);
      client.on('error', onError);
      client.on('close', onClose);
      client.on('offline', onClose);
    } catch (err) {
      console.error('[CommunicationView] Connect invocation failed:', err);
      setLastError(err.message);
      setStatus('ERROR');
    }
  }, [context?.wsJwt, subscribeChannels]);

  useEffect(() => {
    if ((status === 'OFFLINE' || status === 'ERROR') && context?.wsJwt) {
      connect();
    }
  }, [context?.wsJwt]);

  const publish = () => {
    if (!title.trim() || !message.trim()) return;

    if (!Communication.client || status !== 'CONNECTED') {
      connect();
      return;
    }

    const sender = user?.username
      ? `@${user.username} · ${process.env.EXPO_PUBLIC_OD_APP_ID}`
      : process.env.EXPO_PUBLIC_OD_APP_ID;

    const payloadObj = { sender, title: title.trim(), content: message.trim() };

    try {
      const targetTopic = channelType === 'public'
        ? Communication.PUBLIC_CHANNEL
        : (subtopic.trim() || 'events');

      const resolvedTopic = Communication.publish(targetTopic, payloadObj);

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
      setLastError(err.message);
    }
  };

  const canBroadcast = title.trim() && message.trim() && status === 'CONNECTED';
  const actionLabel = status === 'CONNECTED'
    ? 'BROADCAST PAYLOAD'
    : status === 'ERROR'
      ? 'RETRY CONNECTION'
      : status === 'CONNECTING'
        ? 'CONNECTING...'
        : 'CONNECT UPLINK';

  const inputStyle = {
    padding: 14,
    fontSize: 12,
    backgroundColor: tokens.SURFACE,
    color: tokens.FG,
    borderWidth: tokens.shape.border,
    borderColor: tokens.BORDER,
    marginBottom: 12,
    fontFamily: tokens.font.mono,
    borderRadius: tokens.shape.buttonRadius,
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.BG }}
      contentContainerStyle={{ padding: 20, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ color: tokens.FG, fontSize: 16, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: 1, fontFamily: tokens.font.primary }}>TOPICS SERVICE</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{
            width: 6, height: 6, borderRadius: 3,
            backgroundColor: status === 'CONNECTED' ? tokens.NEON_SUCCESS : (status === 'ERROR' ? tokens.NEON_DANGER : tokens.MUTED),
            shadowColor: status === 'CONNECTED' ? tokens.NEON_SUCCESS : (status === 'ERROR' ? tokens.NEON_DANGER : 'transparent'),
            shadowRadius: 4, shadowOpacity: 0.8
          }} />
          <Text style={{ color: tokens.MUTED, fontSize: 9, fontFamily: tokens.font.mono, fontWeight: 'bold' }}>
            {status}
          </Text>
        </View>
      </View>

      {lastError && (
        <View style={{
          backgroundColor: isDark ? tokens.SURFACE : '#FFF5F5',
          padding: 12,
          marginBottom: 20,
          borderWidth: tokens.shape.border,
          borderColor: tokens.NEON_DANGER,
          borderRadius: tokens.shape.buttonRadius,
        }}>
          <Text style={{ color: tokens.NEON_DANGER, fontSize: 9, fontFamily: tokens.font.mono }}>ERROR: {lastError}</Text>
        </View>
      )}

      <View style={{ marginBottom: 30 }}>
        <View style={{ flexDirection: 'row', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: tokens.font.primary }}>SENDER:</Text>
          {user?.username && (
            <View style={{ backgroundColor: tokens.SURFACE, paddingHorizontal: 8, paddingVertical: 4, borderWidth: tokens.shape.border, borderColor: tokens.NEON_SUCCESS, borderRadius: tokens.shape.pillRadius }}>
              <Text style={{ color: tokens.NEON_SUCCESS, fontSize: 10, fontWeight: 'bold', fontFamily: tokens.font.mono }}>@{user.username}</Text>
            </View>
          )}
          <View style={{ backgroundColor: tokens.SURFACE, paddingHorizontal: 8, paddingVertical: 4, borderWidth: tokens.shape.border, borderColor: tokens.BORDER, borderRadius: tokens.shape.pillRadius }}>
            <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: tokens.font.mono }}>{process.env.EXPO_PUBLIC_OD_APP_ID}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <ChannelButton
            active={channelType === 'app'}
            label="APP SUBTOPIC"
            onPress={() => setChannelType('app')}
            tokens={tokens}
            onPrimary={onPrimary}
          />
          <ChannelButton
            active={channelType === 'public'}
            label="PUBLIC CHANNEL"
            onPress={() => setChannelType('public')}
            tokens={tokens}
            onPrimary={onPrimary}
          />
        </View>

        {channelType === 'app' && (
          <TextInput
            style={inputStyle}
            value={subtopic}
            onChangeText={setSubtopic}
            placeholder="Subtopic name (e.g. chat, events)"
            placeholderTextColor={tokens.MUTED}
          />
        )}

        <TextInput
          style={inputStyle}
          value={title}
          onChangeText={setTitle}
          placeholder="Event Title (e.g. MISSION_COMPLETE)"
          placeholderTextColor={tokens.MUTED}
        />

        <TextInput
          style={{ ...inputStyle, height: 80, textAlignVertical: 'top', marginBottom: 16 }}
          value={message}
          onChangeText={setMessage}
          placeholder="Payload Message..."
          placeholderTextColor={tokens.MUTED}
          multiline
        />

        <TouchableOpacity
          style={{
            backgroundColor: (canBroadcast || status === 'ERROR' || status === 'OFFLINE')
              ? tokens.NEON_PRIMARY
              : tokens.SURFACE,
            padding: 16,
            alignItems: 'center',
            borderRadius: tokens.shape.buttonRadius,
            borderWidth: tokens.shape.border,
            borderColor: (canBroadcast || status === 'ERROR' || status === 'OFFLINE')
              ? tokens.NEON_PRIMARY
              : tokens.BORDER,
          }}
          onPress={status === 'CONNECTED' ? publish : connect}
          disabled={status === 'CONNECTING' || (status === 'CONNECTED' && !canBroadcast)}
        >
          <Text style={{
            color: (canBroadcast || status === 'ERROR' || status === 'OFFLINE') ? onPrimary : tokens.MUTED,
            fontSize: 11,
            fontWeight: GLOBAL_STYLES.heavy,
            letterSpacing: 1,
            fontFamily: tokens.font.primary
          }}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: tokens.MUTED, fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12, fontFamily: tokens.font.primary }}>RECENT_BROADCASTS</Text>

        <View style={{ paddingBottom: 40 }}>
          {logs.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center', borderWidth: tokens.shape.border, borderColor: tokens.BORDER, borderStyle: 'dashed', borderRadius: tokens.shape.cardRadius }}>
              <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: tokens.font.mono }}>NO EVENTS TRANSMITTED</Text>
            </View>
          ) : (
            logs.map((log) => (
              <LogCard key={log.id} log={log} tokens={tokens} />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
