import React from 'react';
import { StyleSheet, Text, View, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, space, radii, type as typeTokens } from '../core/tokens';

export default function TransactionModal({ visible, intent, onApprove, onReject, balances }) {
  if (!intent) return null;

  const { chain = 'evm', to = '', amount = '0' } = intent;
  const activeBalance = chain.toLowerCase() === 'solana' ? balances.solana : balances.evm;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onReject}
    >
      <View style={styles.overlay}>
        <View style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <View style={styles.alertBadgeRow}>
              <Ionicons name="shield-checkmark" size={12} color={colors.status.warning} style={{ marginRight: 4 }} />
              <Text style={styles.alertBadge}>SECURITY GATEWAY</Text>
            </View>
            <Text style={styles.alertTitle}>Approve Transaction</Text>
            <Text style={styles.alertSubtitle}>
              An active mini-app is requesting authorization to transfer assets from your connected wallet.
            </Text>
          </View>

          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Network</Text>
              <Text style={styles.detailValue}>
                {chain.toUpperCase() === 'SOLANA' ? 'Solana Mainnet' : 'EVM / Base Network'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>To Address</Text>
              <Text style={[styles.detailValue, styles.mono]}>
                {to.slice(0, 10)}...{to.slice(-8)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={[styles.detailValue, styles.highlightAmount]}>
                {amount} {chain.toUpperCase() === 'SOLANA' ? 'SOL' : 'ETH'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Connected Balance</Text>
              <Text style={styles.detailValue}>
                {activeBalance} {chain.toUpperCase() === 'SOLANA' ? 'SOL' : 'ETH'}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.rejectButton,
                pressed && { opacity: 0.85 }
              ]}
              onPress={onReject}
              accessibilityRole="button"
              accessibilityLabel="Reject transaction"
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.approveButton,
                pressed && { opacity: 0.85 }
              ]}
              onPress={onApprove}
              accessibilityRole="button"
              accessibilityLabel={`Approve and sign transaction: ${amount} ${chain.toUpperCase() === 'SOLANA' ? 'SOL' : 'ETH'}`}
            >
              <Text style={styles.approveButtonText}>Approve & Sign</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.xxl,
  },
  alertCard: {
    backgroundColor: colors.bg.modal,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    width: '100%',
    maxWidth: 420,
    padding: space.xxl,
    gap: space.xl,
  },
  alertHeader: {
    gap: 6,
  },
  alertBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertBadge: {
    color: colors.status.warning,
    fontSize: typeTokens.micro,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  alertTitle: {
    color: colors.text.primary,
    fontSize: typeTokens.h3,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  alertSubtitle: {
    color: colors.text.muted,
    fontSize: typeTokens.small + 1,
    lineHeight: 16,
  },
  detailsBox: {
    backgroundColor: colors.bg.nested,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.sm,
    padding: space.lg,
    gap: space.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: colors.text.muted,
    fontSize: typeTokens.small,
    fontWeight: '600',
  },
  detailValue: {
    color: colors.text.primary,
    fontSize: typeTokens.small + 1,
    fontWeight: '700',
  },
  mono: {
    fontFamily: 'monospace',
  },
  highlightAmount: {
    color: colors.status.warning,
    fontSize: typeTokens.body,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginVertical: space.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: space.md,
  },
  button: {
    flex: 1,
    paddingVertical: space.md,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.status.danger,
  },
  rejectButtonText: {
    color: colors.status.danger,
    fontSize: typeTokens.body,
    fontWeight: '700',
  },
  approveButton: {
    backgroundColor: colors.status.success,
  },
  approveButtonText: {
    color: colors.text.inverse,
    fontSize: typeTokens.body,
    fontWeight: '700',
  },
});
