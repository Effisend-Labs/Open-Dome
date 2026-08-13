import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LINE = 22;
const PAD_Y = 10;
const MIN_H = LINE + PAD_Y * 2;
const MAX_H = LINE * 5 + PAD_Y * 2;

function clampHeight(h) {
  return Math.min(MAX_H, Math.max(MIN_H, Math.ceil(h)));
}

export function DomeAgentComposer({
  theme,
  n,
  value,
  onChange,
  onSend,
  disabled,
  canSend,
  placeholder,
}) {
  const [height, setHeight] = useState(MIN_H);
  const atCap = height >= MAX_H;

  useEffect(() => {
    if (!value) setHeight(MIN_H);
  }, [value]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.textContent = 'textarea::-webkit-scrollbar{display:none}textarea{resize:none;scrollbar-width:none}';
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  return (
    <View style={styles.bar}>
      <View style={styles.field}>
        <Text
          pointerEvents="none"
          style={styles.measure}
          onLayout={(e) => {
            setHeight(value ? clampHeight(e.nativeEvent.layout.height) : MIN_H);
          }}
        >
          {value ? `${value} ` : ' '}
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              height,
              color: theme.text.primary,
              backgroundColor: theme.bg.card,
              borderColor: theme.border.default,
              overflow: atCap ? 'auto' : 'hidden',
            },
          ]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={theme.text.muted || theme.text.secondary}
          multiline
          editable={!disabled}
          pointerEvents="auto"
          scrollEnabled={atCap}
          textAlignVertical="center"
          blurOnSubmit={false}
        />
      </View>
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        style={[
          styles.send,
          {
            backgroundColor: canSend ? theme.text.primary : theme.bg.card,
            borderColor: theme.border.default,
            opacity: canSend ? 1 : 0.45,
            height: MIN_H,
            width: MIN_H,
          },
        ]}
      >
        <Ionicons
          name="arrow-up"
          size={n(18)}
          color={canSend ? (theme.bg.root || '#000') : theme.text.secondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
    zIndex: 4,
  },
  field: { flex: 1, position: 'relative', zIndex: 4 },
  measure: {
    position: 'absolute',
    opacity: 0,
    zIndex: -1,
    top: 0,
    left: 0,
    right: 0,
    fontSize: 16,
    lineHeight: LINE,
    paddingHorizontal: 14,
    paddingVertical: PAD_Y,
  },
  input: {
    width: '100%',
    fontSize: 16,
    lineHeight: LINE,
    paddingHorizontal: 14,
    paddingVertical: PAD_Y,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 1,
    outlineStyle: 'none',
  },
  send: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
