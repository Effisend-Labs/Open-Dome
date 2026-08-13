import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, TextInput, Animated } from 'react-native';
import { GLOBAL_STYLES } from '../theme';
import { USE_NATIVE_DRIVER } from '../utils/styleCompat';

// ── Progress Bar ────────────────────────────────────────────────────────────────
// Fills proportionally to estimated transfer time (latency-optimized feedback).
const ProgressBar = ({ duration, color, trackColor }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: duration,
      useNativeDriver: false, // width interpolation requires JS driver
    }).start();
  }, [duration]);

  return (
    <View style={{ width: '100%', height: 3, backgroundColor: trackColor, borderRadius: 1.5, overflow: 'hidden', marginTop: 20 }}>
      <Animated.View style={{
        height: '100%',
        backgroundColor: color,
        borderRadius: 1.5,
        width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
      }} />
    </View>
  );
};

export default function SendModal({ visible, onClose, tokens, isDark }) {
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
  const [sourceChain, setSourceChain] = useState('Base');
  const [destChain, setDestChain] = useState('Solana');
  const [fastTransfer, setFastTransfer] = useState(true);
  const [gasless, setGasless] = useState(true);
  
  const [status, setStatus] = useState('idle'); // idle, confirm, loading, success
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setStatus('idle');
      setAmount('');
      setDestination('');
      fadeAnim.setValue(1);
    }
  }, [visible]);

  const handleAction = () => {
    if (status === 'idle') {
      // First press: morph to "Execute Transfer" (cognitive friction)
      setStatus('confirm');
      return;
    }

    if (status === 'confirm') {
      // Second press: actually execute
      setStatus('loading');
      
      const delay = fastTransfer ? 8000 : 400;
      
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: USE_NATIVE_DRIVER
        }).start(() => {
          setStatus('success');
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: USE_NATIVE_DRIVER
          }).start();
        });
      }, delay);
    }
  };

  const isEVM = destChain !== 'Solana';
  const canProceed = amount && destination;
  const transferDuration = fastTransfer ? 8000 : 400;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.container, { 
          backgroundColor: tokens.BG,
          // Dynamic tray height (Family Wallet pattern)
          minHeight: status === 'idle' || status === 'confirm' ? '50%' : '60%',
        }]}>
          
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: tokens.BORDER }]}>
            <Text style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]}>Send USDC</Text>
            <TouchableOpacity onPress={() => { setStatus('idle'); onClose(); }} style={styles.closeBtn}>
              <Text style={{ color: tokens.MUTED, fontSize: 24, lineHeight: 24 }}>×</Text>
            </TouchableOpacity>
          </View>

          {status === 'success' ? (
            <Animated.View style={[styles.content, { opacity: fadeAnim, alignItems: 'center', paddingVertical: 40 }]}>
              {/* Geometric checkmark — no emoji */}
              <View style={[styles.successCircle, { backgroundColor: tokens.SUCCESS + '20' }]}>
                <View style={{ width: 8, height: 16, borderRightWidth: 2.5, borderBottomWidth: 2.5, borderColor: tokens.SUCCESS, transform: [{ rotate: '45deg' }], marginTop: -4 }} />
              </View>
              <Text style={[styles.successTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>Transfer Complete</Text>
              <Text style={[styles.successDesc, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
                {amount || '0'} USDC arrived on {destChain}.
              </Text>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: tokens.SURFACE_ELEVATED, borderColor: tokens.BORDER, borderWidth: 1, marginTop: 24 }]}
                onPress={() => { setStatus('idle'); onClose(); }}
              >
                <Text style={[styles.primaryBtnText, { color: tokens.FG, fontFamily: tokens.font.primary }]}>Done</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : status === 'loading' ? (
            <Animated.View style={[styles.content, { opacity: fadeAnim, alignItems: 'center', paddingVertical: 40 }]}>
              <Text style={[styles.loadingTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
                {fastTransfer ? 'Executing CCTP Fast Transfer' : 'Signing Gateway Intent'}
              </Text>
              <Text style={[styles.loadingDesc, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary, marginTop: 8 }]}>
                {fastTransfer ? 'Waiting for global allowance pool (8-20s)...' : 'Fetching attestation (< 500ms)...'}
              </Text>
              {gasless && (
                <Text style={[styles.loadingDesc, { color: tokens.ACCENT, fontFamily: tokens.font.primary, marginTop: 8 }]}>
                  Forwarding Service: Subsidizing destination gas
                </Text>
              )}
              {/* Progress Bar — latency-optimized feedback */}
              <ProgressBar duration={transferDuration} color={tokens.ACCENT} trackColor={tokens.BORDER} />
            </Animated.View>
          ) : (
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
              {/* Chains */}
              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={[styles.label, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>From</Text>
                  <View style={[styles.dropdown, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
                    <Text style={{ color: tokens.FG, fontFamily: tokens.font.primary }}>{sourceChain}</Text>
                  </View>
                </View>
                <View style={styles.half}>
                  <Text style={[styles.label, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>To</Text>
                  <View style={[styles.dropdown, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
                    <Text style={{ color: tokens.FG, fontFamily: tokens.font.primary }}>{destChain}</Text>
                  </View>
                </View>
              </View>

              {/* Amount */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>Amount</Text>
                <View style={[styles.inputWrapper, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
                  <Text style={{ color: tokens.FG, fontSize: 18, fontFamily: tokens.font.mono }}>$</Text>
                  <TextInput
                    style={[styles.input, { color: tokens.FG, fontFamily: tokens.font.mono }]}
                    placeholder="0.00"
                    placeholderTextColor={tokens.MUTED}
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={(v) => { setAmount(v); if (status === 'confirm') setStatus('idle'); }}
                  />
                  <Text style={{ color: tokens.MUTED, fontFamily: tokens.font.primary }}>USDC</Text>
                </View>
              </View>

              {/* Address */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>Destination Address</Text>
                <TextInput
                  style={[styles.inputFull, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER, color: tokens.FG, fontFamily: tokens.font.mono }]}
                  placeholder={isEVM ? "0x..." : "Solana address..."}
                  placeholderTextColor={tokens.MUTED}
                  value={destination}
                  onChangeText={(v) => { setDestination(v); if (status === 'confirm') setStatus('idle'); }}
                />
              </View>

              {/* Toggles */}
              <View style={styles.toggles}>
                <TouchableOpacity 
                  activeOpacity={0.7} 
                  style={[styles.toggleRow, { borderBottomColor: tokens.BORDER }]} 
                  onPress={() => setFastTransfer(!fastTransfer)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.toggleTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>Enable Fast Transfer</Text>
                    <Text style={[styles.toggleDesc, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>Settles in 8-20s. Incurs a $0.15 risk premium fee.</Text>
                  </View>
                  <View style={[styles.checkbox, { backgroundColor: fastTransfer ? tokens.ACCENT : 'transparent', borderColor: fastTransfer ? tokens.ACCENT : tokens.BORDER }]}>
                    {fastTransfer && <View style={{ width: 5, height: 9, borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: '#FFF', transform: [{ rotate: '45deg' }], marginTop: -2 }} />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  activeOpacity={0.7} 
                  style={[styles.toggleRow, { borderBottomColor: tokens.BORDER }]} 
                  onPress={() => setGasless(!gasless)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.toggleTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>Gasless Destination (Forwarding)</Text>
                    <Text style={[styles.toggleDesc, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
                      Pay destination gas with USDC. {!isEVM ? 'Includes ATA rent fee.' : ''}
                    </Text>
                  </View>
                  <View style={[styles.checkbox, { backgroundColor: gasless ? tokens.ACCENT : 'transparent', borderColor: gasless ? tokens.ACCENT : tokens.BORDER }]}>
                    {gasless && <View style={{ width: 5, height: 9, borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: '#FFF', transform: [{ rotate: '45deg' }], marginTop: -2 }} />}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Action — Two-step confirmation (cognitive friction) */}
              <TouchableOpacity
                style={[styles.primaryBtn, { 
                  backgroundColor: status === 'confirm' ? tokens.ACCENT : (canProceed ? tokens.FG : tokens.SURFACE_ELEVATED),
                  borderColor: status === 'confirm' ? tokens.ACCENT : (canProceed ? tokens.FG : tokens.BORDER),
                }]}
                onPress={handleAction}
                disabled={!canProceed}
                activeOpacity={0.8}
              >
                <Text style={[styles.primaryBtnText, { 
                  color: status === 'confirm' ? '#FFFFFF' : (canProceed ? tokens.BG : tokens.MUTED), 
                  fontFamily: tokens.font.primary 
                }]}>
                  {status === 'confirm' ? 'Execute Transfer' : 'Confirm & Send'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
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
    paddingBottom: 40,
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
  content: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  half: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdown: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
  },
  inputGroup: {
    marginBottom: 20,
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
    paddingHorizontal: 8,
    height: '100%',
  },
  inputFull: {
    borderWidth: 1,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 56,
    fontSize: 14,
  },
  toggles: {
    marginBottom: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  toggleDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
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
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 14,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingDesc: {
    fontSize: 13,
  },
});
