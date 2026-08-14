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
  SEND_ASSETS,
  getSendUsdcChain,
  assetLabelForChain,
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
  const [assetKey, setAssetKey] = useState('USDC');
  const [status, setStatus] = useState('idle');
  const [scanning, setScanning] = useState(false);
  const [openPicker, setOpenPicker] = useState(null);
  const { send, error, result, reset } = useSponsoredTransfer();

  useEffect(() => {
    if (!visible) return;
    setStatus('idle');
    setAmount('');
    setDestination('');
    setSourceKey('BASE');
    setAssetKey('USDC');
    setScanning(false);
    setOpenPicker(null);
    reset();
  }, [visible, reset]);

  const source = getSendUsdcChain(sourceKey);
  const destChain = destinationChain(destination);
  const pairOk =
    !destination ||
    !isDestinationAddress(destination) ||
    isValidSendPair(sourceKey, destChain === 'solana' ? 'solana' : 'evm', assetKey);

  const handleAmount = (raw) => {
    setAmount(sanitizeUsdcAmount(raw));
    if (status === 'error') setStatus('idle');
  };

  const handleAction = async () => {
    if (status === 'loading') return;
    if (!isValidSendPair(sourceKey, destChain === 'solana' ? 'solana' : 'evm', assetKey)) {
      return;
    }
    setStatus('loading');
    try {
      await send({ amount, destination, blockchain: sourceKey, asset: assetKey });
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
    isValidSendPair(sourceKey, destChain === 'solana' ? 'solana' : 'evm', assetKey);
  const destIncomplete = destination.length > 0 && !isDestinationAddress(destination);
  const toOwnSolana = Boolean(solanaAddress) && destination === solanaAddress;
  const bridging = assetKey === 'USDC' && destChain === 'solana' && sourceKey === 'BASE';
  const assetLabel = assetLabelForChain(assetKey, sourceKey);
  const gasNote = gasNoteForSend({ sourceKey, destChain, assetKey });

  const fromLabel =
    bridging
      ? `${source.label} USDC → Solana`
      : `${source.label} ${assetLabel}`;

  const destPlaceholder =
    sourceKey === 'SOL'
      ? 'Solana address (32 bytes)'
      : assetKey === 'NATIVE'
        ? '0x address (42 characters)'
        : '0x… or Solana address (Base only)';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.container, { backgroundColor: tokens.BG }]}>
          <View style={[styles.header, { borderBottomColor: tokens.BORDER }]}>
            <Text style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
              Send assets
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
              assetLabel={assetLabel}
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
              assetLabel={assetLabel}
              destination={destination}
              tokens={tokens}
              chain={bridging ? 'solana' : destChain}
              isBridging={bridging}
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
                <TouchableOpacity
                  onPress={() => setOpenPicker(openPicker === 'network' ? null : 'network')}
                  activeOpacity={0.75}
                  style={[styles.selectControl, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}
                >
                  <View>
                    <Text style={[styles.selectValue, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
                      {source.label}
                    </Text>
                    <Text style={[styles.selectDescription, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
                      Network
                    </Text>
                  </View>
                  <Text style={{ color: tokens.MUTED, fontSize: 16 }}>⌄</Text>
                </TouchableOpacity>
                {openPicker === 'network' ? (
                  <View style={[styles.pickerMenu, { backgroundColor: tokens.SURFACE_ELEVATED, borderColor: tokens.BORDER }]}>
                    {SEND_USDC_CHAINS.map((chain) => (
                      <TouchableOpacity
                        key={chain.key}
                        onPress={() => {
                          setSourceKey(chain.key);
                          setOpenPicker(null);
                          if (status === 'error') setStatus('idle');
                        }}
                        style={[styles.pickerOption, sourceKey === chain.key && { backgroundColor: tokens.ACCENT_SOFT }]}
                      >
                        <Text style={{ color: sourceKey === chain.key ? tokens.ACCENT : tokens.FG, fontFamily: tokens.font.primary }}>
                          {chain.label}
                        </Text>
                        <Text style={{ color: tokens.MUTED, fontFamily: tokens.font.primary, fontSize: 12 }}>
                          {chain.gasToken}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
                <View style={[styles.network, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
                  <Text style={{ color: tokens.FG, fontFamily: tokens.font.primary }}>{fromLabel}</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
                  Asset
                </Text>
                <TouchableOpacity
                  onPress={() => setOpenPicker(openPicker === 'asset' ? null : 'asset')}
                  activeOpacity={0.75}
                  style={[styles.selectControl, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}
                >
                  <View>
                    <Text style={[styles.selectValue, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
                      {assetLabel}
                    </Text>
                    <Text style={[styles.selectDescription, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
                      {assetKey === 'USDC' ? 'USD Coin' : `Native to ${source.label}`}
                    </Text>
                  </View>
                  <Text style={{ color: tokens.MUTED, fontSize: 16 }}>⌄</Text>
                </TouchableOpacity>
                {openPicker === 'asset' ? (
                  <View style={[styles.pickerMenu, { backgroundColor: tokens.SURFACE_ELEVATED, borderColor: tokens.BORDER }]}>
                    {SEND_ASSETS.map((asset) => (
                      <TouchableOpacity
                        key={asset.key}
                        onPress={() => {
                          setAssetKey(asset.key);
                          setOpenPicker(null);
                          if (status === 'error') setStatus('idle');
                        }}
                        style={[styles.pickerOption, assetKey === asset.key && { backgroundColor: tokens.ACCENT_SOFT }]}
                      >
                        <Text style={{ color: assetKey === asset.key ? tokens.ACCENT : tokens.FG, fontFamily: tokens.font.primary }}>
                          {asset.key === 'NATIVE' ? assetLabelForChain('NATIVE', sourceKey) : asset.label}
                        </Text>
                        <Text style={{ color: tokens.MUTED, fontFamily: tokens.font.primary, fontSize: 12 }}>
                          {asset.description}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
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
                  <Text style={{ color: tokens.MUTED, fontFamily: tokens.font.primary }}>{assetLabel}</Text>
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
                {assetKey === 'USDC' && solanaAddress && (sourceKey === 'BASE' || sourceKey === 'SOL') ? (
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
                      ? 'Enter a valid 32-byte Solana address'
                      : 'Enter a valid 42-character EVM address, or a Solana address for Base USDC'}
                  </Text>
                ) : null}
                {destination && isDestinationAddress(destination) && !pairOk ? (
                  <Text style={[styles.destHint, { color: tokens.DANGER || tokens.ACCENT, fontFamily: tokens.font.primary }]}>
                    {assetKey === 'NATIVE'
                      ? 'Native tokens can only be sent on the same network type'
                      : destChain === 'solana'
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
                        : `Send ${amount} ${assetLabel}`
                      : `Send ${assetLabel}`}
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
  selectControl: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  selectDescription: {
    marginTop: 2,
    fontSize: 12,
  },
  pickerMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pickerOption: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  network: {
    marginTop: 10,
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
