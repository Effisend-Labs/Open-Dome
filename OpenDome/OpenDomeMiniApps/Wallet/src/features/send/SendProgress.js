import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';

const BASE_STEPS = ['Signing', 'Sponsoring gas', 'Confirming on Base'];
const SOLANA_STEPS = ['Approving USDC', 'Burning on Base', 'Minting on Solana'];

function shortAddr(value) {
  const s = String(value || '');
  if (s.length < 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function chainLabel(chain) {
  return chain === 'solana' ? 'Base → Solana' : 'Base';
}

function Summary({ amount, destination, tokens, chain }) {
  return (
    <View style={[styles.summary, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
      <Text style={[styles.amount, { color: tokens.FG, fontFamily: tokens.font.mono }]}>
        {amount || '0'} USDC
      </Text>
      <Text style={[styles.meta, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
        to {shortAddr(destination)} · {chainLabel(chain)}
      </Text>
    </View>
  );
}

export function SendLoading({ amount, destination, tokens, chain }) {
  const steps = chain === 'solana' ? SOLANA_STEPS : BASE_STEPS;
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }, 1600);
    return () => clearInterval(id);
  }, [steps.length]);

  return (
    <View style={styles.wrap}>
      <Summary amount={amount} destination={destination} tokens={tokens} chain={chain} />
      <View style={styles.steps}>
        {steps.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <View key={label} style={styles.stepRow}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: done || active ? tokens.ACCENT : 'transparent',
                    borderColor: done || active ? tokens.ACCENT : tokens.BORDER,
                  },
                ]}
              />
              <Text
                style={[
                  styles.stepLabel,
                  {
                    color: active ? tokens.FG : done ? tokens.FG_SECONDARY : tokens.MUTED,
                    fontFamily: tokens.font.primary,
                    fontWeight: active ? '600' : '500',
                  },
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={[styles.caption, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
        {chain === 'solana'
          ? 'Circle CCTP bridges Base USDC to native Solana USDC'
          : 'OpenDome sponsors gas with Circle Gas Station'}
      </Text>
    </View>
  );
}

export function SendSuccess({ amount, destination, txHash, mintTxHash, tokens, onDone, chain }) {
  const explorer = txHash
    ? `https://basescan.org/tx/${txHash}`
    : null;
  const solExplorer = mintTxHash ? `https://solscan.io/tx/${mintTxHash}` : null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sent, { color: tokens.SUCCESS, fontFamily: tokens.font.primary }]}>
        Sent
      </Text>
      <Summary amount={amount} destination={destination} tokens={tokens} chain={chain} />
      {explorer ? (
        <TouchableOpacity
          style={[styles.txRow, { borderColor: tokens.BORDER, backgroundColor: tokens.SURFACE }]}
          onPress={() => Linking.openURL(explorer).catch(() => {})}
          activeOpacity={0.7}
        >
          <Text style={[styles.txLabel, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
            Transaction
          </Text>
          <Text style={[styles.txHash, { color: tokens.FG, fontFamily: tokens.font.mono }]}>
            {shortAddr(txHash)} ↗
          </Text>
        </TouchableOpacity>
      ) : null}
      {solExplorer ? (
        <TouchableOpacity
          style={[styles.txRow, { borderColor: tokens.BORDER, backgroundColor: tokens.SURFACE }]}
          onPress={() => Linking.openURL(solExplorer).catch(() => {})}
          activeOpacity={0.7}
        >
          <Text style={[styles.txLabel, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
            Solana mint
          </Text>
          <Text style={[styles.txHash, { color: tokens.FG, fontFamily: tokens.font.mono }]}>
            {shortAddr(mintTxHash)} ↗
          </Text>
        </TouchableOpacity>
      ) : null}
      <Text style={[styles.caption, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
        {chain === 'solana'
          ? mintTxHash
            ? 'Native USDC minted on Solana'
            : 'Burn confirmed on Base. Solana mint follows in about a minute — pull to refresh Portfolio.'
          : 'OpenDome sponsored gas with Circle Gas Station'}
      </Text>
      <TouchableOpacity
        style={[styles.doneBtn, { backgroundColor: tokens.FG }]}
        onPress={onDone}
        activeOpacity={0.85}
      >
        <Text style={[styles.doneText, { color: tokens.BG, fontFamily: tokens.font.primary }]}>
          Done
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 20,
    paddingBottom: 8,
    gap: 16,
  },
  summary: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  amount: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  meta: {
    marginTop: 6,
    fontSize: 13,
  },
  steps: {
    gap: 12,
    paddingVertical: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  stepLabel: {
    fontSize: 14,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
  },
  sent: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  txRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  txLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  txHash: {
    fontSize: 13,
  },
  doneBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
