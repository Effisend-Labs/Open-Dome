import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOpenDome, Host } from 'opendome';
import { Ionicons } from '@expo/vector-icons';

const ADMIN_PASSWORD = "OpenDomeX402";

export default function SecretScanner({ tokens }) {
  const { blockchain } = useOpenDome();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [password, setPassword] = useState('');

  // Scanner State
  const [network, setNetwork] = useState('base');
  const [contractAddress, setContractAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [isReusable, setIsReusable] = useState(false);
  const [consumeAmount, setConsumeAmount] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Status check state
  const [isChecking, setIsChecking] = useState(false);
  const [availabilityMsg, setAvailabilityMsg] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    let cancelled = false;
    Host.platformConfig()
      .then((cfg) => {
        if (cancelled) return;
        const addr = cfg?.passContractAddress || cfg?.contractAddress || '';
        if (addr) setContractAddress(addr);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const checkAuth = async () => {
    try {
      const auth = await AsyncStorage.getItem('@scanner_auth');
      if (auth === 'true') {
        setIsAdmin(true);
      }
    } catch (e) {}
  };

  const handleLogin = async () => {
    if (password === ADMIN_PASSWORD) {
      await AsyncStorage.setItem('@scanner_auth', 'true');
      setIsAdmin(true);
      setShowAuth(false);
      setShowScanner(true);
    } else {
      Alert.alert("Authentication Failed", "Invalid Passcode");
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('@scanner_auth');
    setIsAdmin(false);
    setShowScanner(false);
    setAvailabilityMsg(null);
  };

  const checkAvailability = async () => {
    if (!contractAddress || !tokenId) {
      Alert.alert("Input Required", "Please enter a valid Contract Address and Token ID.");
      return;
    }
    
    setIsChecking(true);
    setAvailabilityMsg(null);
    try {
      if (isReusable) {
        const remaining = await blockchain.getRemainingAccesses(contractAddress, tokenId);
        setAvailabilityMsg(`${remaining} accesses remaining`);
      } else {
        const isUsed = await blockchain.getTicketStatus(contractAddress, tokenId);
        setAvailabilityMsg(isUsed ? "Ticket is ALREADY USED" : "Ticket is VALID");
      }
    } catch (err) {
      console.warn("Check Failed", err);
      // Fallback for demo purposes if contract isn't deployed yet
      if (isReusable) {
        setAvailabilityMsg(`Contract read failed: Simulating 5 accesses remaining.`);
      } else {
        setAvailabilityMsg(`Contract read failed: Simulating VALID ticket.`);
      }
    }
    setIsChecking(false);
  };

  const handleScan = async () => {
    if (!contractAddress || !tokenId) {
      Alert.alert("Input Required", "Missing contract or token ID");
      return;
    }

    setIsProcessing(true);
    try {
      if (isReusable) {
        await blockchain.consumePassAccess(network, contractAddress, tokenId, consumeAmount);
        Alert.alert("Redemption Successful", `Consumed ${consumeAmount} access(es) for Token #${tokenId}`);
      } else {
        await blockchain.markTicketAsUsed(network, contractAddress, tokenId);
        Alert.alert("Redemption Successful", `Ticket #${tokenId} marked as used.`);
      }
      setAvailabilityMsg(null);
    } catch (err) {
      console.error(err);
      Alert.alert("Redemption Failed", err.message);
    }
    setIsProcessing(false);
  };

  return (
    <>
      {/* Hidden Edge Trigger */}
      <TouchableOpacity 
        style={styles.hiddenTrigger} 
        activeOpacity={1}
        onLongPress={() => isAdmin ? setShowScanner(true) : setShowAuth(true)}
      />

      {/* Auth Modal */}
      <Modal visible={showAuth} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalBg} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalCard, { backgroundColor: tokens.SURFACE_ELEVATED }]}>
            <Text style={[styles.modalTitle, { color: tokens.FG }]}>Terminal Access</Text>
            <Text style={[styles.modalSubtitle, { color: tokens.FG_SECONDARY }]}>Authorized personnel only</Text>
            <TextInput 
              style={[styles.input, { color: tokens.FG, borderColor: tokens.BORDER, backgroundColor: tokens.BG }]}
              placeholder="Enter secure passcode"
              placeholderTextColor={tokens.MUTED}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <View style={styles.btnRow}>
              <TouchableOpacity onPress={() => setShowAuth(false)} style={styles.btnGhost}>
                <Text style={[styles.btnGhostText, { color: tokens.FG_SECONDARY }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogin} style={[styles.btnPrimary, { backgroundColor: tokens.FG }]}>
                <Text style={[styles.btnPrimaryText, { color: tokens.BG }]}>Unlock Terminal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Scanner Modal */}
      <Modal visible={showScanner} transparent animationType="slide">
        <View style={[styles.scannerBg, { backgroundColor: tokens.BG }]}>
          <View style={styles.scannerHeader}>
            <View>
              <Text style={[styles.scannerTitle, { color: tokens.FG }]}>Venue Scanner Terminal</Text>
              <Text style={[styles.scannerSubtitle, { color: tokens.ACCENT || tokens.FG_SECONDARY }]}>System: Online</Text>
            </View>
            <TouchableOpacity onPress={() => setShowScanner(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={tokens.FG} />
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: tokens.FG_SECONDARY }]}>Contract Address</Text>
              <TextInput 
                style={[styles.input, { color: tokens.FG, borderColor: tokens.BORDER, backgroundColor: tokens.SURFACE_ELEVATED }]}
                value={contractAddress}
                onChangeText={(val) => { setContractAddress(val); setAvailabilityMsg(null); }}
                placeholder="0x..."
                placeholderTextColor={tokens.MUTED}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: tokens.FG_SECONDARY }]}>Token ID</Text>
              <TextInput 
                style={[styles.input, { color: tokens.FG, borderColor: tokens.BORDER, backgroundColor: tokens.SURFACE_ELEVATED }]}
                value={tokenId}
                onChangeText={(val) => { setTokenId(val); setAvailabilityMsg(null); }}
                keyboardType="number-pad"
                placeholder="e.g. 1"
                placeholderTextColor={tokens.MUTED}
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.label, { color: tokens.FG_SECONDARY }]}>Pass Type</Text>
              <TouchableOpacity 
                style={[styles.toggleBtn, isReusable ? { backgroundColor: tokens.SURFACE_ELEVATED, borderColor: tokens.BORDER } : { backgroundColor: tokens.FG, borderColor: tokens.FG }]}
                onPress={() => { setIsReusable(false); setAvailabilityMsg(null); }}
              >
                <Text style={[styles.toggleText, isReusable ? { color: tokens.FG } : { color: tokens.BG }]}>Event Pass</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, isReusable ? { backgroundColor: tokens.FG, borderColor: tokens.FG } : { backgroundColor: tokens.SURFACE_ELEVATED, borderColor: tokens.BORDER }]}
                onPress={() => { setIsReusable(true); setAvailabilityMsg(null); }}
              >
                <Text style={[styles.toggleText, isReusable ? { color: tokens.BG } : { color: tokens.FG }]}>Reusable Pass</Text>
              </TouchableOpacity>
            </View>

            {availabilityMsg && (
              <View style={[styles.availabilityCard, { backgroundColor: tokens.SURFACE_ELEVATED, borderColor: availabilityMsg.includes("ALREADY USED") || availabilityMsg.includes("0 accesses") ? tokens.ERROR : tokens.BORDER }]}>
                <Text style={[styles.availabilityText, { color: tokens.FG }]}>{availabilityMsg}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: tokens.BORDER }]}
              onPress={checkAvailability}
              disabled={isChecking}
            >
              {isChecking ? <ActivityIndicator color={tokens.FG} size="small" /> : (
                <Text style={[styles.actionBtnText, { color: tokens.FG }]}>Check Availability</Text>
              )}
            </TouchableOpacity>

            {isReusable && (
              <View style={styles.counterRow}>
                <Text style={[styles.label, { color: tokens.FG_SECONDARY }]}>Redemption Amount</Text>
                <View style={styles.counterControls}>
                  <TouchableOpacity onPress={() => setConsumeAmount(Math.max(1, consumeAmount - 1))} style={[styles.counterBtn, { backgroundColor: tokens.SURFACE_ELEVATED }]}>
                    <Text style={[styles.counterText, { color: tokens.FG }]}>-</Text>
                  </TouchableOpacity>
                  <Text style={[styles.counterValue, { color: tokens.FG }]}>{consumeAmount}</Text>
                  <TouchableOpacity onPress={() => setConsumeAmount(consumeAmount + 1)} style={[styles.counterBtn, { backgroundColor: tokens.SURFACE_ELEVATED }]}>
                    <Text style={[styles.counterText, { color: tokens.FG }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: tokens.FG }]}
              onPress={handleScan}
              disabled={isProcessing}
            >
              {isProcessing ? <ActivityIndicator color={tokens.BG} size="small" /> : (
                <Text style={[styles.submitBtnText, { color: tokens.BG }]}>
                  {isReusable ? `Consume ${consumeAmount} Accesses` : 'Redeem Ticket'}
                </Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={{ color: tokens.ERROR || '#FF3B30', fontSize: 13, letterSpacing: 0.5, fontWeight: '500' }}>DISCONNECT TERMINAL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  hiddenTrigger: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 25,
    height: 120,
    zIndex: 9999,
    backgroundColor: 'transparent',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    padding: 32,
    borderRadius: 8, // Apple-level slightly sharp radius
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 13,
    letterSpacing: 0.5,
    marginTop: -8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 16,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  btnGhost: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  btnGhostText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  btnPrimary: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 6,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scannerBg: {
    flex: 1,
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  scannerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  scannerSubtitle: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
  },
  formContainer: {
    padding: 24,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  availabilityCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
  },
  availabilityText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionBtn: {
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    fontSize: 24,
    fontWeight: '400',
    marginTop: -2,
  },
  counterValue: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  submitBtn: {
    marginTop: 12,
    paddingVertical: 18,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  logoutBtn: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 12,
  }
});
