import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';

export function AuthMock() {
  return (
    <View style={styles.section} id="auth-demo">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Seamless Integration</Text>
          <Text style={styles.headerSubtitle}>See how easily your Mini-App docks into the Host.</Text>
        </View>
        
        <View style={styles.authBox}>
          
          <View style={styles.connectionVisual}>
             <View style={styles.node}>
               <Text style={styles.nodeText}>Mini-App</Text>
             </View>
             
             <View style={styles.connectionLine}>
               <Text style={styles.connectionStatus}>Securely Connected</Text>
             </View>
             
             <View style={[styles.node, styles.hostNode]}>
               <Text style={[styles.nodeText, styles.hostNodeText]}>Host Super App</Text>
             </View>
          </View>

          <Pressable 
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Test Connection"
          >
            <Text style={styles.primaryBtnText}>Test Connection</Text>
          </Pressable>
          
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 120,
    paddingHorizontal: 32,
    alignItems: 'center',
    backgroundColor: '#F2F2F0', // Soft Clay tone for contrast against F9F9F8
    width: '100%',
  },
  container: {
    maxWidth: 600,
    width: '100%',
    gap: 48,
  },
  header: {
    alignItems: 'center',
    gap: 16,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#0A0A0C',
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 18,
    color: '#4A4A4D',
    textAlign: 'center',
  },
  authBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(10, 10, 12, 0.05)',
    borderRadius: 16,
    padding: 48,
    gap: 48,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 32px rgba(10, 10, 12, 0.04)',
    } : {
      elevation: 3,
    }),
  },
  connectionVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  node: {
    backgroundColor: '#F9F9F8',
    borderWidth: 1,
    borderColor: 'rgba(10, 10, 12, 0.1)',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeText: {
    fontWeight: '600',
    fontSize: 16,
    color: '#0A0A0C',
  },
  hostNode: {
    backgroundColor: '#0A0A0C',
    borderColor: '#0A0A0C',
  },
  hostNodeText: {
    color: '#F9F9F8',
  },
  connectionLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(10, 10, 12, 0.1)',
    marginHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionStatus: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    fontSize: 12,
    color: '#0033A0', // Cobalt Accent
    fontWeight: '600',
    marginTop: -20, // Float above line
  },
  primaryBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#0033A0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  primaryBtnPressed: {
    backgroundColor: '#002277',
    transform: [{ scale: 0.98 }],
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
