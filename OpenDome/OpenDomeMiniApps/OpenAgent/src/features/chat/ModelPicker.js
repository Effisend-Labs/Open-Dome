import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GEMINI_CHAT_MODELS, resolveGeminiChatModel } from 'opendome/src/agentTariff.js';

export function ModelPicker({ tokens, modelId, onChange }) {
  const [open, setOpen] = useState(false);
  const active = resolveGeminiChatModel(modelId);

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => setOpen((v) => !v)} hitSlop={8} style={styles.trigger}>
        <Text style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
          {active.shortLabel}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={tokens.MUTED} />
      </Pressable>

      {open ? (
        <View style={[styles.menu, { backgroundColor: tokens.SURFACE }]}>
          {GEMINI_CHAT_MODELS.map((model) => {
            const selected = model.id === modelId;
            return (
              <Pressable
                key={model.id}
                onPress={() => {
                  onChange(model.id);
                  setOpen(false);
                }}
                style={styles.option}
              >
                <Text
                  style={{
                    color: selected ? tokens.FG : tokens.FG_SECONDARY,
                    fontFamily: tokens.font.primary,
                    fontSize: 15,
                    fontWeight: selected ? '600' : '400',
                  }}
                >
                  {model.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 20 },
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  menu: {
    position: 'absolute',
    top: 32,
    left: 0,
    minWidth: 220,
    borderRadius: 14,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  option: { paddingHorizontal: 14, paddingVertical: 10 },
});
