import React from 'react';
import { StyleSheet, Text, View, Pressable, Modal } from 'react-native';

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
            <Text style={styles.alertBadge}>SECURITY GATEWAY</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertCard: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 8,
    width: '100%',
    maxWidth: 420,
    padding: 24,
    gap: 20,
  },
  alertHeader: {
    gap: 6,
  },
  alertBadge: {
    color: '#FFD60A',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  alertTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  alertSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    lineHeight: 16,
  },
  detailsBox: {
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 4,
    padding: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600',
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mono: {
    fontFamily: 'monospace',
  },
  highlightAmount: {
    color: '#FFD60A',
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: '#2C2C2E',
    marginVertical: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF453A',
  },
  rejectButtonText: {
    color: '#FF453A',
    fontSize: 13,
    fontWeight: '700',
  },
  approveButton: {
    backgroundColor: '#30D158',
  },
  approveButtonText: {
    color: '#0A0A0A',
    fontSize: 13,
    fontWeight: '700',
  }
});
