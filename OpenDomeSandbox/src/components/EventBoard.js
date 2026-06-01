import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Animated } from 'react-native';
import mqtt from 'mqtt';

const MQTT_CONFIG = {
  host: 'mqtt.effisend.dpdns.org',
  port: 443,
  protocol: 'wss',
  username: 'opendome_host'
};

export default function EventBoard({ config = {} }) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('DISCONNECTED');

  const { username, jwt } = config;

  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

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

  useEffect(() => {
    const activeJwt = config.jwt;
    const activeUsername = config.username || MQTT_CONFIG.username;
    if (!activeJwt) return;
    
    const url = `${MQTT_CONFIG.protocol}://${MQTT_CONFIG.host}:${MQTT_CONFIG.port}/`;
    const client = mqtt.connect(url, {
      username: activeUsername,
      password: activeJwt,
      clientId: `opendome_web_${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 20000,
      rejectUnauthorized: false,
      protocolVersion: 4,
      wsOptions: { protocol: 'mqtt' }
    });

    client.on('connect', () => {
      setStatus('CONNECTED');
      // Subscribe to the full opendome namespace — hears all apps and channels.
      // The topic is shown in each card for easy debugging.
      client.subscribe('opendome/#');
    });

    client.on('message', (topic, message) => {
      const payload = message.toString();
      let data;
      try {
        data = JSON.parse(payload);
      } catch (e) {
        data = { content: payload };
      }

      setMessages(prev => [
        { id: Date.now(), topic, ...data, timestamp: new Date().toLocaleTimeString() },
        ...prev
      ].slice(0, 50)); // Keep last 50
    });

    client.on('error', (err) => {
      console.error('MQTT Error:', err);
      setStatus('ERROR');
    });

    client.on('close', () => setStatus('DISCONNECTED'));

    return () => client.end();
  }, [username, jwt]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>COMMUNICATION API</Text>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: status === 'CONNECTED' ? '#34C759' : '#FF3B30' }]} />
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
            <Text style={styles.emptyText}>Waiting for incoming events...</Text>
          </View>
        ) : (
          messages.map((msg) => (
            <View key={msg.id} style={styles.noticeCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.topic}>{msg.topic.toUpperCase()}</Text>
                <Text style={styles.time}>{msg.timestamp}</Text>
              </View>
              {msg.sender && (
                <View style={styles.senderRow}>
                  <View style={styles.senderBadge}>
                    <Text style={styles.senderIcon}>📦</Text>
                    <Text style={styles.senderText}>{msg.sender}</Text>
                  </View>
                </View>
              )}
              <Text style={styles.noticeTitle}>{msg.title || 'Untitled Message'}</Text>
              {renderContent(msg.content || msg)}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', padding: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 0.5, borderBottomColor: '#333', paddingBottom: 10 },
  title: { color: '#86868B', fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: APPLE_FONT },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: '#FFF', fontSize: 9, fontWeight: 'bold', fontFamily: APPLE_FONT },
  scroll: { flex: 1 },
  noticeCard: { backgroundColor: '#2C2C2E', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  topic: { color: '#0A84FF', fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5, fontFamily: APPLE_FONT },
  time: { color: '#86868B', fontSize: 9, fontFamily: 'monospace' },
  senderRow: { flexDirection: 'row', marginBottom: 10 },
  senderBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#3A3A3C', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: '#48484A' },
  senderIcon: { fontSize: 9 },
  senderText: { color: '#FFD60A', fontSize: 9, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 0.5 },
  noticeTitle: { color: '#FFF', fontSize: 14, fontWeight: '600', marginBottom: 4, fontFamily: APPLE_FONT },
  noticeContent: { color: '#D2D2D7', fontSize: 12, lineHeight: 18, fontFamily: APPLE_FONT },
  jsonBlock: { marginTop: 4, backgroundColor: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 4 },
  jsonLine: { fontFamily: 'monospace', fontSize: 11, marginBottom: 2 },
  jsonKey: { color: '#86868B' },
  jsonString: { color: '#34C759' },
  jsonNumber: { color: '#0A84FF' },
  emptyContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 40, gap: 10 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#86868B' },
  emptyText: { color: '#444', fontSize: 12, fontStyle: 'italic', fontFamily: APPLE_FONT }
});
