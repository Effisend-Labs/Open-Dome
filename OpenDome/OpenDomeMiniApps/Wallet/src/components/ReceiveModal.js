import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Image, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { boxShadow } from '../utils/styleCompat';

export default function ReceiveModal({ visible, onClose, tokens, isDark, evmAddress, solanaAddress }) {
  const [activeTab, setActiveTab] = useState('EVM');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible) {
      setActiveTab('EVM');
      setCopied(false);
    }
  }, [visible]);

  const activeAddress = activeTab === 'EVM' ? evmAddress : solanaAddress;
  const qrUrl = activeAddress ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${activeAddress}` : null;

  const handleCopy = async () => {
    if (activeAddress) {
      await Clipboard.setStringAsync(activeAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.container, { backgroundColor: tokens.BG }]}>
          
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: tokens.BORDER }]}>
            <Text style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]}>Receive</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: tokens.MUTED, fontSize: 24, lineHeight: 24 }}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Network Selector */}
            <View style={[styles.tabContainer, { backgroundColor: tokens.SURFACE }]}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'EVM' && { backgroundColor: tokens.BG, ...boxShadow({ blur: 2, opacity: 0.1, elevation: 2 }) }]}
                onPress={() => { setActiveTab('EVM'); setCopied(false); }}
              >
                <Text style={[styles.tabText, { color: activeTab === 'EVM' ? tokens.FG : tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>EVM</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'Solana' && { backgroundColor: tokens.BG, ...boxShadow({ blur: 2, opacity: 0.1, elevation: 2 }) }]}
                onPress={() => { setActiveTab('Solana'); setCopied(false); }}
              >
                <Text style={[styles.tabText, { color: activeTab === 'Solana' ? tokens.FG : tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>Solana</Text>
              </TouchableOpacity>
            </View>

            {/* QR Code Area */}
            <View style={styles.content}>
              {qrUrl ? (
                <View style={[styles.qrWrapper, { backgroundColor: '#FFFFFF', borderColor: tokens.BORDER }]}>
                  <Image source={{ uri: qrUrl }} style={styles.qrImage} />
                </View>
              ) : (
                <View style={[styles.qrWrapper, { backgroundColor: tokens.SURFACE_ELEVATED, justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ color: tokens.MUTED, fontFamily: tokens.font.primary }}>Address missing</Text>
                </View>
              )}

              <View style={[styles.addressBox, { backgroundColor: tokens.SURFACE_ELEVATED, borderColor: tokens.BORDER }]}>
                <Text style={[styles.addressLabel, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
                  {activeTab} Address
                </Text>
                <Text style={[styles.addressText, { color: tokens.FG, fontFamily: tokens.font.mono }]} selectable={true}>
                  {activeAddress || 'Not generated yet'}
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.copyButton, { backgroundColor: copied ? tokens.SUCCESS : tokens.FG }]}
                onPress={handleCopy}
                disabled={!activeAddress}
              >
                <Text style={[styles.copyButtonText, { color: tokens.BG, fontFamily: tokens.font.primary }]}>
                  {copied ? 'Copied!' : 'Copy Address'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

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
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginTop: 24,
    padding: 4,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'center',
  },
  qrWrapper: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 24,
    ...boxShadow({ offsetY: 4, blur: 12, opacity: 0.1, elevation: 5 }),
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  addressBox: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  addressLabel: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
  },
  copyButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
