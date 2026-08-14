import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { useSponsoredTransfer } from '../features/send/useSponsoredTransfer';
import { sanitizeUsdcAmount, isUsdcAmountReady } from '../features/send/sanitizeUsdcAmount';
import { SendLoading, SendSuccess } from '../features/send/SendProgress';
import { DestinationQrScanner } from '../features/send/DestinationQrScanner';
import {
  sanitizeDestinationInput,
  isDestinationAddress,
  destinationChain,
} from '../features/send/destinationAddress';
import {
  SEND_USDC_CHAINS,
  getSendUsdcChain,
  gasNoteForSend,
  isValidSendPair,
} from '../features/send/sendChains';

export default function SendModal({
  visible,
  onClose,
  tokens,
  isDark,
  solanaAddress,
}) {
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
  const [sourceKey, setSourceKey] = useState('BASE');
  const [status, setStatus] = useState('idle');
  const [scanning, setScanning] = useState(false);
  const { send, error, result, reset } = useSponsoredTransfer();

  useEffect(() => {
    if (!visible) return;
    setStatus('idle');
    setAmount('');
    setDestination('');
    setSourceKey('BASE');
    setScanning(false);
    reset();
  }, [visible, reset]);

  const source = getSendUsdcChain(sourceKey);
  const destChain = destinationChain(destination);
  const pairOk =
    !destination ||
    !isDestinationAddress(destination) ||
    isValidSendPair(sourceKey, destChain === 'solana' ? 'solana' : 'evm');

  const handleAmount = (raw) => {
    setAmount(sanitizeUsdcAmount(raw));
    if (status === 'error') setStatus('idle');
  };

  const handleAction = async () => {
    if (status === 'loading') return;
    if (!isValidSendPair(sourceKey, destChain === 'solana' ? 'solana' : 'evm')) {
      return;
    }
    setStatus('loading');
    try {
      await send({ amount, destination, blockchain: sourceKey });
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const handleDestination = (raw) => {
    setDestination(sanitizeDestinationInput(raw));
    if (status === 'error') setStatus('idle');
  };

  const fillMySolana = () => {
    if (!solanaAddress) return;
    if (sourceKey !== 'BASE' && sourceKey !== 'SOL') {
      setSourceKey('BASE');
    }
    setDestination(solanaAddress);
    if (status === 'error') setStatus('idle');
  };

  const handleQrAddress = useCallback((addr) => {
    setDestination(addr);
    setScanning(false);
    if (status === 'error') setStatus('idle');
  }, [status]);

  const canProceed =
    isUsdcAmountReady(amount) &&
    isDestinationAddress(destination) &&
    isValidSendPair(sourceKey, destChain === 'solana' ? 'solana' : 'evm');
  const destIncomplete = destination.length > 0 && !isDestinationAddress(destination);
  const toOwnSolana = Boolean(solanaAddress) && destination === solanaAddress;
  const bridging = destChain === 'solana' && sourceKey === 'BASE';
  const gasNote = gasNoteForSend({ sourceKey, destChain });

  const fromLabel =
    bridging
      ? `${source.label} USDC → Solana`
      : `${source.label} USDC`;

  const destPlaceholder =
    sourceKey === 'SOL' ? 'Solana address' : '0x… or Solana address (Base only)';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.container, { backgroundColor: tokens.BG }]}>
          <View style={[styles.header, { borderBottomColor: tokens.BORDER }]}>
            <Text style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
              Send USDC
            </Text>
            <TouchableOpacity
              onPress={() => {
                setStatus('idle');
                onClose();
              }}
              style={styles.closeBtn}
            >
              <Text style={{ color: tokens.MUTED, fontSize: 24, lineHeight: 24 }}>×</Text>
            </TouchableOpacity>
          </View>

          {scanning ? (
            <DestinationQrScanner
              tokens={tokens}
              onClose={() => setScanning(false)}
              onAddress={handleQrAddress}
            />
          ) : status === 'success' ? (
            <SendSuccess
              amount={amount}
              destination={destination}
              txHash={result?.txHash}
              mintTxHash={result?.mintTxHash}
              chain={result?.chain || destChain}
              tokens={tokens}
              onDone={() => {
                setStatus('idle');
                onClose();
              }}
            />
          ) : status === 'loading' ? (
            <SendLoading
              amount={amount}
              destination={destination}
              tokens={tokens}
              chain={bridging ? 'solana' : destChain}
            />
          ) : (
            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
                  From
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chainRow}
                >
                  {SEND_USDC_CHAINS.map((chain) => {
                    const active = sourceKey === chain.key;
                    return (
                      <TouchableOpacity
                        key={chain.key}
                        onPress={() => {
                          setSourceKey(chain.key);
                          if (status === 'error') setStatus('idle');
                        }}
                        activeOpacity={0.8}
                        style={[
                          styles.chainChip,
                          {
                            backgroundColor: active ? tokens.ACCENT_SOFT : tokens.SURFACE,
                            borderColor: active ? tokens.ACCENT : tokens.BORDER,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: active ? tokens.ACCENT : tokens.FG,
                            fontFamily: tokens.font.primary,
                            fontSize: 13,
                            fontWeight: active ? '600' : '500',
                          }}
                        >
                          {chain.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <View style={[styles.network, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
                  <Text style={{ color: tokens.FG, fontFamily: tokens.font.primary }}>{fromLabel}</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
                  Amount
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
                  <TextInput
                    style={[styles.input, { color: tokens.FG, fontFamily: tokens.font.mono }]}
                    placeholder="0.00"
                    placeholderTextColor={tokens.MUTED}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    value={amount}
                    onChangeText={handleAmount}
                  />
                  <Text style={{ color: tokens.MUTED, fontFamily: tokens.font.primary }}>USDC</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
                  Destination
                </Text>
                <View style={styles.destRow}>
                  <TextInput
                    style={[
                      styles.inputFull,
                      styles.destInput,
                      {
                        backgroundColor: tokens.SURFACE,
                        borderColor:
                          destIncomplete || (destination && !pairOk)
                            ? tokens.DANGER || tokens.ACCENT
                            : tokens.BORDER,
                        color: tokens.FG,
                        fontFamily: tokens.font.mono,
                      },
                    ]}
                    placeholder={destPlaceholder}
                    placeholderTextColor={tokens.MUTED}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={destination}
                    onChangeText={handleDestination}
                  />
                  <TouchableOpacity
                    style={[styles.scanBtn, { backgroundColor: tokens.SURFACE_ELEVATED, borderColor: tokens.BORDER }]}
                    onPress={() => setScanning(true)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.scanBtnText, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
                      Scan
                    </Text>
                  </TouchableOpacity>
                </View>
                {solanaAddress && (sourceKey === 'BASE' || sourceKey === 'SOL') ? (
                  <TouchableOpacity onPress={fillMySolana} activeOpacity={0.7} style={styles.solChipWrap}>
                    <Text
                      style={[
                        styles.solChip,
                        {
                          color: toOwnSolana ? tokens.ACCENT : tokens.FG_SECONDARY,
                          fontFamily: tokens.font.primary,
                        },
                      ]}
                    >
                      {toOwnSolana ? 'Sending to your Solana wallet' : 'Use my Solana wallet'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {destIncomplete ? (
                  <Text style={[styles.destHint, { color: tokens.DANGER || tokens.ACCENT, fontFamily: tokens.font.primary }]}>
                    {sourceKey === 'SOL'
                      ? 'Paste a Solana address'
                      : 'Paste a 0x address, or a Solana address when source is Base'}
                  </Text>
                ) : null}
                {destination && isDestinationAddress(destination) && !pairOk ? (
                  <Text style={[styles.destHint, { color: tokens.DANGER || tokens.ACCENT, fontFamily: tokens.font.primary }]}>
                    {destChain === 'solana'
                      ? 'Solana destinations require Base (bridge) or Solana source'
                      : 'Switch source off Solana to send to a 0x address'}
                  </Text>
                ) : null}
              </View>

              <Text style={[styles.gasNote, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
                {gasNote}
              </Text>

              {status === 'error' && error ? (
                <Text style={[styles.error, { color: tokens.DANGER || tokens.ACCENT, fontFamily: tokens.font.primary }]}>
                  {error}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: canProceed ? tokens.ACCENT : tokens.SURFACE_ELEVATED,
                    borderColor: canProceed ? tokens.ACCENT : tokens.BORDER,
                  },
                ]}
                onPress={handleAction}
                disabled={!canProceed}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.primaryBtnText,
                    {
                      color: canProceed ? '#FFFFFF' : tokens.MUTED,
                      fontFamily: tokens.font.primary,
                    },
                  ]}
                >
                  {status === 'error'
                    ? 'Try again'
                    : amount
                      ? bridging
                        ? `Bridge ${amount} USDC to Solana`
                        : `Send ${amount} USDC`
                      : 'Send USDC'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  contentScroll: {
    flexGrow: 0,
  },
  content: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chainRow: {
    gap: 8,
    paddingBottom: 10,
  },
  chainChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  network: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 18,
    paddingRight: 8,
    height: '100%',
  },
  destRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  destInput: {
    flex: 1,
  },
  inputFull: {
    borderWidth: 1,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 56,
    fontSize: 14,
  },
  scanBtn: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  solChipWrap: {
    marginTop: 8,
  },
  solChip: {
    fontSize: 13,
    fontWeight: '600',
  },
  destHint: {
    marginTop: 8,
    fontSize: 12,
  },
  gasNote: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 20,
  },
  error: {
    fontSize: 13,
    marginBottom: 16,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
