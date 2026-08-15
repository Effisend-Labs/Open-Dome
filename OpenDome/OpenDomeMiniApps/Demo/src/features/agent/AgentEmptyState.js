import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GLOBAL_STYLES } from '../../theme';

const STARTERS = ['What can you do?', 'Tell me a joke', 'Explain Open-Dome'];

export function AgentEmptyState({ tokens, t, onPick }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
        <Text style={{ fontSize: 22, color: tokens.NEON_PRIMARY }}>✦</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
        {t.agent?.workspace || 'Agent Workspace'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
        {t.agent?.helpText || 'Ask me anything — I can help with tasks, questions, and more.'}
      </Text>
      <View style={styles.chipCol}>
        {STARTERS.map((chip) => (
          <TouchableOpacity
            key={chip}
            style={[styles.chip, { borderColor: tokens.BORDER, backgroundColor: tokens.SURFACE, borderRadius: tokens.shape.buttonRadius }]}
            onPress={() => onPick(chip)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, { color: tokens.FG, fontFamily: tokens.font.primary }]}>{chip}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: GLOBAL_STYLES.heavy,
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  chipCol: { width: '100%', maxWidth: 320, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  chipText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
});
