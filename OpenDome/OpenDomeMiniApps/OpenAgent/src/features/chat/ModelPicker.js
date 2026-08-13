import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GEMINI_CHAT_MODELS } from 'opendome/src/agentTariff.js';

export function ModelPicker({ tokens, modelId, onChange }) {
  return (
    <View style={styles.row}>
      {GEMINI_CHAT_MODELS.map((model) => {
        const active = model.id === modelId;
        return (
          <TouchableOpacity
            key={model.id}
            activeOpacity={0.8}
            onPress={() => onChange(model.id)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? tokens.ACCENT_SOFT : tokens.SURFACE,
                borderColor: active ? tokens.ACCENT : tokens.BORDER,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: active ? tokens.ACCENT : tokens.FG_SECONDARY,
                  fontFamily: tokens.font.primary,
                },
              ]}
            >
              {model.shortLabel || model.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  chip: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  label: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
