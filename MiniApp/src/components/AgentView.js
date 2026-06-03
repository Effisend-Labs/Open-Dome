import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useOpenDome } from 'opendome';
import { GLOBAL_STYLES } from '../theme';

export default function AgentView({ tokens, theme, username }) {
  const isDark = theme === 'dark';
  const { Agent } = useOpenDome();
  const [prompt, setPrompt] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef(null);

  const handleSend = async () => {
    const text = prompt.trim();
    if (!text) return;

    setPrompt('');
    
    const userMsg = { id: Date.now().toString(), role: 'user', content: text };
    setConversation(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const responseText = await Agent.prompt(text);
      const aiMsg = { id: (Date.now() + 1).toString(), role: 'agent', content: responseText };
      setConversation(prev => [...prev, aiMsg]);
    } catch (err) {
      const errMsg = { id: (Date.now() + 1).toString(), role: 'system', content: `[ERROR] ${err.message}` };
      setConversation(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.BG, padding: 24 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#1C1C1E' : '#E5E5EA' }}>
        <View>
          <Text style={{ color: tokens.FG, fontSize: 18, fontWeight: '700', letterSpacing: -0.5, fontFamily: GLOBAL_STYLES.sans }}>Agent Workspace</Text>
          <Text style={{ color: tokens.MUTED, fontSize: 11, fontFamily: GLOBAL_STYLES.sans, marginTop: 4 }}>Powered by Bedrock</Text>
        </View>
        <View style={{ backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#2C2C2E' : '#E5E5EA' }}>
          <Text style={{ color: '#34C759', fontSize: 9, fontFamily: GLOBAL_STYLES.monospace, fontWeight: 'bold' }}>SECURE_LINK</Text>
        </View>
      </View>

      {/* Conversation Window */}
      <ScrollView 
        ref={scrollViewRef}
        style={{ flex: 1, marginBottom: 16 }} 
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {conversation.length === 0 && (
          <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 80, opacity: 0.6 }}>
            <Text style={{ color: tokens.MUTED, fontSize: 14, fontFamily: GLOBAL_STYLES.sans }}>
              How can I help you today?
            </Text>
          </View>
        )}
        
        {conversation.map(msg => (
          <View key={msg.id} style={{ 
            marginBottom: 24, 
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%'
          }}>
            <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: GLOBAL_STYLES.sans, marginBottom: 6, paddingHorizontal: 4, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
              {msg.role === 'user' ? 'You' : (msg.role === 'agent' ? 'Agent' : 'System')}
            </Text>
            <View style={{
              backgroundColor: msg.role === 'user' ? (isDark ? '#1C1C1E' : '#F2F2F7') : 'transparent',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 20,
              borderBottomRightRadius: msg.role === 'user' ? 4 : 20,
              borderBottomLeftRadius: msg.role === 'agent' ? 4 : 20,
              borderWidth: msg.role === 'agent' ? 1 : 0,
              borderColor: isDark ? '#2C2C2E' : '#E5E5EA',
            }}>
              <Text style={{ 
                color: msg.role === 'system' ? '#FF453A' : tokens.FG, 
                fontSize: 14, 
                lineHeight: 22, 
                fontFamily: msg.role === 'system' ? GLOBAL_STYLES.monospace : GLOBAL_STYLES.sans,
                letterSpacing: -0.2
              }}>
                {msg.content}
              </Text>
            </View>
          </View>
        ))}

        {isTyping && (
          <View style={{ alignSelf: 'flex-start', marginBottom: 24, maxWidth: '85%' }}>
            <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: GLOBAL_STYLES.sans, marginBottom: 6, paddingHorizontal: 4 }}>Agent</Text>
            <View style={{ backgroundColor: 'transparent', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: isDark ? '#2C2C2E' : '#E5E5EA' }}>
              <Text style={{ color: tokens.MUTED, fontSize: 14, fontFamily: GLOBAL_STYLES.sans }}>Thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingTop: 16 }}>
        <TextInput
          style={{
            flex: 1,
            backgroundColor: isDark ? '#09090B' : '#FFFFFF',
            color: tokens.FG,
            fontFamily: GLOBAL_STYLES.sans,
            fontSize: 14,
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 14,
            maxHeight: 120,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: isDark ? '#2C2C2E' : '#E5E5EA',
            marginRight: 10
          }}
          placeholder="Ask anything..."
          placeholderTextColor={tokens.MUTED}
          value={prompt}
          onChangeText={setPrompt}
          multiline
        />
        <TouchableOpacity 
          onPress={handleSend}
          disabled={!prompt.trim() || isTyping}
          style={{
            backgroundColor: !prompt.trim() || isTyping ? (isDark ? '#1C1C1E' : '#F2F2F7') : tokens.NEON_PRIMARY,
            height: 48,
            width: 48,
            borderRadius: 24,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: !prompt.trim() || isTyping ? (isDark ? '#2C2C2E' : '#E5E5EA') : 'transparent',
          }}
        >
          <Text style={{ 
            color: !prompt.trim() || isTyping ? tokens.MUTED : (isDark ? '#000' : '#FFF'), 
            fontFamily: GLOBAL_STYLES.sans, 
            fontWeight: '600', 
            fontSize: 16,
            marginTop: -2
          }}>
            ↑
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
