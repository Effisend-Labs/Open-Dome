import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, Pressable, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import mqtt from 'mqtt';
import { colors, space, radii, type as typeTokens } from '../core/tokens';

const MQTT_CONFIG = {
  host: 'mqtt.effisend.dpdns.org',
  port: 443,
  protocol: 'wss',
  username: 'opendome_host'
};

export default function EventBoard({ config = {}, activeUserProfile = null }) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('DISCONNECTED');
  const [inputText, setInputText] = useState('');
  const [client, setClient] = useState(null);

  const { jwt } = config;
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    const activeJwt = config.jwt;
    const activeUsername = activeUserProfile?.username ? 'opendome_host' : MQTT_CONFIG.username;
    
    // Only connect if we have a communication JWT
    if (!activeJwt) {
      setStatus('WAITING_FOR_JWT');
      return;
    }

    const url = `${MQTT_CONFIG.protocol}://${MQTT_CONFIG.host}:${MQTT_CONFIG.port}/`;
    console.log(`[EventBoard] Connecting to MQTT broker at ${url} (username: ${activeUsername})`);
    
    const mqttClient = mqtt.connect(url, {
      username: activeUsername,
      password: activeJwt,
      clientId: `opendome_host_client_${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 20000,
      rejectUnauthorized: false,
      protocolVersion: 4,
      wsOptions: { protocol: 'mqtt' }
    });

    mqttClient.on('connect', () => {
      setStatus('CONNECTED');
      mqttClient.subscribe('opendome/#');
    });

    mqttClient.on('message', (topic, message) => {
      const payload = message.toString();
      let parsedData;
      try {
        parsedData = JSON.parse(payload);
      } catch (e) {
        parsedData = { content: payload };
      }

      setMessages(prev => [
        { 
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, 
          topic, 
          ...parsedData, 
          timestamp: new Date().toLocaleTimeString() 
        },
        ...prev
      ].slice(0, 50));
    });

    mqttClient.on('error', (err) => {
      console.error('[EventBoard] MQTT Connection Error:', err);
      setStatus('ERROR');
    });

    mqttClient.on('close', () => {
      setStatus('DISCONNECTED');
    });

    setClient(mqttClient);

    return () => {
      if (mqttClient) mqttClient.end();
    };
  }, [config.jwt, activeUserProfile?.username]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !client || status !== 'CONNECTED') return;

    // Attach username of the user if connected, else guest or simply don't attach
    const messagePayload = {
      title: activeUserProfile?.username ? 'Host Broadcast' : 'Guest Broadcast',
      content: inputText.trim(),
    };

    if (activeUserProfile?.username) {
      messagePayload.sender = activeUserProfile.username;
    }

    // Publish to the ecosystem public channel
    const topic = 'opendome/public';
    client.publish(topic, JSON.stringify(messagePayload));
    setInputText('');
  };

  const renderContent = (content) => {
    if (typeof content === 'object' && content !== null) {
      return (
        <View style={styles.jsonBlock}>
          {Object.entries(content).map(([key, value]) => (
            <Text key={key} style={styles.jsonLine}>
              <Text style={styles.jsonKey}>"{key}"</Text>:{" "}
              <Text style={typeof value === 'string' ? styles.jsonString : styles.jsonNumber}>
                {typeof value === 'string' ? `"${value}"` : String(value)}
              </Text>
              ,
            </Text>
          ))}
        </View>
      );
    }
    return <Text style={styles.noticeContent}>{String(content)}</Text>;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>COMMUNICATION BUS</Text>
        <View style={styles.statusBadge} accessibilityLabel={`Connection status: ${status}`}>
          <View style={[styles.statusDot, { backgroundColor: status === 'CONNECTED' ? colors.status.success : colors.status.danger }]} />
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>

      {/* Composer Section */}
      <View style={styles.composer}>
        <TextInput
          style={styles.composerInput}
          placeholder={status === 'CONNECTED' ? "Type a public message..." : "Waiting for connection..."}
          placeholderTextColor={colors.text.disabled}
          value={inputText}
          onChangeText={setInputText}
          editable={status === 'CONNECTED'}
          accessibilityLabel="Public message composer"
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            (pressed || status !== 'CONNECTED') && { opacity: 0.8 }
          ]}
          onPress={handleSendMessage}
          disabled={status !== 'CONNECTED'}
          accessibilityRole="button"
          accessibilityLabel="Send public message"
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {messages.length === 0 ? (
          <View style={styles.emptyContainer} accessibilityLiveRegion="polite">
            {status === 'CONNECTED' && <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />}
            <Text style={styles.emptyText}>
              {status === 'CONNECTED'
                ? 'Waiting for incoming events...'
                : status === 'WAITING_FOR_JWT'
                  ? 'Login or load mini-app to initialize communication.'
                  : 'Disconnected from event broker.'
              }
            </Text>
          </View>
        ) : (
          messages.map((msg) => (
            <View key={msg.id} style={styles.noticeCard} accessible accessibilityLabel={`Message from ${msg.sender || 'unknown'} on ${msg.topic} at ${msg.timestamp}: ${msg.title}`}>
              <View style={styles.cardHeader}>
                <Text style={styles.topic}>{msg.topic.toUpperCase()}</Text>
                <Text style={styles.time}>{msg.timestamp}</Text>
              </View>
              {msg.sender ? (
                <View style={styles.senderRow}>
                  <View style={styles.senderBadge}>
                    <Ionicons name="person" size={9} color={colors.status.warning} style={{ marginRight: 4 }} />
                    <Text style={styles.senderText}>{msg.sender}</Text>
                  </View>
                </View>
              ) : null}
              <Text style={styles.noticeTitle}>{msg.title || 'Untitled Message'}</Text>
              {renderContent(msg.content || msg)}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.nested,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    padding: space.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    paddingBottom: space.sm,
  },
  title: {
    color: colors.text.muted,
    fontSize: typeTokens.micro,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    color: colors.text.primary,
    fontSize: typeTokens.micro,
    fontWeight: '700',
  },
  composer: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.lg,
  },
  composerInput: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    fontSize: typeTokens.body,
  },
  sendButton: {
    backgroundColor: colors.brand.alt,
    borderRadius: radii.sm,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: colors.text.onAccent,
    fontSize: typeTokens.small + 1,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  noticeCard: {
    backgroundColor: colors.bg.modal,
    borderRadius: radii.sm + 2,
    padding: space.md,
    marginBottom: space.sm + 2,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  topic: {
    color: colors.brand.alt,
    fontSize: typeTokens.micro,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  time: {
    color: colors.text.muted,
    fontSize: typeTokens.micro,
    fontFamily: 'monospace',
  },
  senderRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  senderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.border.default,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  senderText: {
    color: colors.status.warning,
    fontSize: typeTokens.micro,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  noticeTitle: {
    color: colors.text.primary,
    fontSize: typeTokens.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  noticeContent: {
    color: colors.text.body,
    fontSize: typeTokens.small + 1,
    lineHeight: 16,
  },
  jsonBlock: {
    marginTop: space.xs,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 6,
    borderRadius: radii.sm,
  },
  jsonLine: {
    fontFamily: 'monospace',
    fontSize: typeTokens.micro,
    marginBottom: 1,
  },
  jsonKey: {
    color: colors.text.muted,
  },
  jsonString: {
    color: colors.status.success,
  },
  jsonNumber: {
    color: colors.brand.alt,
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    gap: space.sm,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text.muted,
  },
  emptyText: {
    color: colors.text.disabled,
    fontSize: typeTokens.small + 1,
    fontStyle: 'italic',
  },
});
