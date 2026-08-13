import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LINE = 22;
const PAD_Y = 10;
const MIN_H = LINE + PAD_Y * 2;
const MAX_LINES = 5;
const MAX_H = LINE * MAX_LINES + PAD_Y * 2;

function clampHeight(h) {
  return Math.min(MAX_H, Math.max(MIN_H, Math.ceil(h)));
}

export function Composer({
  tokens,
  value,
  onChange,
  onSend,
  disabled,
  canSend,
  locked = false,
  onLockPress,
  placeholder = 'Message',
}) {
  const [height, setHeight] = useState(MIN_H);
  const atCap = height >= MAX_H;

  useEffect(() => {
    if (!value) setHeight(MIN_H);
  }, [value]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.textContent = [
      'textarea::-webkit-scrollbar { display: none; width: 0; height: 0; }',
      'textarea {',
      '  box-sizing: border-box !important;',
      '  resize: none;',
      '  scrollbar-width: none;',
      '  -ms-overflow-style: none;',
      '}',
    ].join('\n');
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  return (
    <View style={styles.bar}>
      <View style={styles.field}>
        <Text
          style={styles.measure}
          onLayout={(e) => {
            if (!value) {
              setHeight(MIN_H);
              return;
            }
            setHeight(clampHeight(e.nativeEvent.layout.height));
          }}
        >
          {value ? `${value} ` : ' '}
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              height,
              color: tokens.FG,
              backgroundColor: tokens.SURFACE,
              overflow: atCap ? 'auto' : 'hidden',
            },
          ]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={tokens.MUTED}
          multiline
          numberOfLines={1}
          editable={!disabled && !locked}
          pointerEvents={locked ? 'none' : 'auto'}
          maxLength={1000}
          scrollEnabled={atCap}
          showsVerticalScrollIndicator={false}
          textAlignVertical="center"
          includeFontPadding={false}
          onKeyPress={(e) => {
            if (Platform.OS !== 'web') return;
            if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
              e.preventDefault?.();
              if (canSend) onSend();
            }
          }}
        />
        {locked ? (
          <Pressable style={StyleSheet.absoluteFill} onPress={onLockPress} />
        ) : null}
      </View>
      <Pressable
        onPress={locked ? onLockPress : onSend}
        disabled={!locked && !canSend}
        style={[
          styles.send,
          { backgroundColor: !locked && canSend ? tokens.FG : tokens.SURFACE_ELEVATED },
        ]}
      >
        <Ionicons name="arrow-up" size={18} color={canSend ? tokens.BG : tokens.MUTED} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  field: {
    flex: 1,
    position: 'relative',
    height: undefined,
    justifyContent: 'flex-end',
  },
  measure: {
    position: 'absolute',
    opacity: 0,
    zIndex: -1,
    top: 0,
    left: 0,
    right: 0,
    fontSize: 16,
    lineHeight: LINE,
    paddingHorizontal: 16,
    paddingTop: PAD_Y,
    paddingBottom: PAD_Y,
  },
  input: {
    width: '100%',
    fontSize: 16,
    lineHeight: LINE,
    paddingHorizontal: 16,
    paddingTop: PAD_Y,
    paddingBottom: PAD_Y,
    borderWidth: 0,
    borderRadius: MIN_H / 2,
    outlineStyle: 'none',
    boxSizing: 'border-box',
  },
  send: {
    width: MIN_H,
    height: MIN_H,
    borderRadius: MIN_H / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
