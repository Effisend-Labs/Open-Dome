import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, Pressable, Animated, ActivityIndicator } from 'react-native';
import mqtt from 'mqtt';

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
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: status === 'CONNECTED' ? '#34C759' : '#FF3B30' }]} />
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>

      {/* Composer Section */}
      <View style={styles.composer}>
        <TextInput
          style={styles.composerInput}
          placeholder={status === 'CONNECTED' ? "Type a public message..." : "Waiting for connection..."}
          placeholderTextColor="#555"
          value={inputText}
          onChangeText={setInputText}
          editable={status === 'CONNECTED'}
        />
        <Pressable 
          style={({ pressed }) => [
            styles.sendButton,
            (pressed || status !== 'CONNECTED') && { opacity: 0.8 }
          ]}
          onPress={handleSendMessage}
          disabled={status !== 'CONNECTED'}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
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
            <View key={msg.id} style={styles.noticeCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.topic}>{msg.topic.toUpperCase()}</Text>
                <Text style={styles.time}>{msg.timestamp}</Text>
              </View>
              {msg.sender ? (
                <View style={styles.senderRow}>
                  <View style={styles.senderBadge}>
                    <Text style={styles.senderIcon}>👤</Text>
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
    backgroundColor: '#121214', 
    borderWidth: 1, 
    borderColor: '#2C2C2E',
    borderRadius: 8,
    padding: 16
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: '#2C2C2E', 
    paddingBottom: 8 
  },
  title: { 
    color: '#8E8E93', 
    fontSize: 10, 
    fontWeight: '700', 
    letterSpacing: 0.5 
  },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  statusDot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3 
  },
  statusText: { 
    color: '#FFFFFF', 
    fontSize: 9, 
    fontWeight: '700' 
  },
  composer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  composerInput: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  sendButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 4,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scroll: { 
    flex: 1 
  },
  noticeCard: { 
    backgroundColor: '#1C1C1E', 
    borderRadius: 6, 
    padding: 12, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 4 
  },
  topic: { 
    color: '#0A84FF', 
    fontSize: 9, 
    fontWeight: '700', 
    letterSpacing: 0.5 
  },
  time: { 
    color: '#8E8E93', 
    fontSize: 9, 
    fontFamily: 'monospace' 
  },
  senderRow: { 
    flexDirection: 'row', 
    marginBottom: 6 
  },
  senderBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: '#2C2C2E', 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 12, 
  },
  senderIcon: { 
    fontSize: 9 
  },
  senderText: { 
    color: '#FFD60A', 
    fontSize: 9, 
    fontWeight: '700', 
    fontFamily: 'monospace' 
  },
  noticeTitle: { 
    color: '#FFFFFF', 
    fontSize: 13, 
    fontWeight: '600', 
    marginBottom: 2 
  },
  noticeContent: { 
    color: '#D2D2D7', 
    fontSize: 12, 
    lineHeight: 16 
  },
  jsonBlock: { 
    marginTop: 4, 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    padding: 6, 
    borderRadius: 4 
  },
  jsonLine: { 
    fontFamily: 'monospace', 
    fontSize: 10, 
    marginBottom: 1 
  },
  jsonKey: { 
    color: '#8E8E93' 
  },
  jsonString: { 
    color: '#30D158' 
  },
  jsonNumber: { 
    color: '#0A84FF' 
  },
  emptyContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 30, 
    gap: 8 
  },
  pulseDot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    backgroundColor: '#8E8E93' 
  },
  emptyText: { 
    color: '#555558', 
    fontSize: 12, 
    fontStyle: 'italic' 
  }
});
