import React from 'react';
import { StyleSheet, Text, View, Platform, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const BRIDGE_HANDLES: { label: string; icon: FeatherIconName }[] = [
  { label: 'Zero-Trust Security', icon: 'shield' },
  { label: 'Unified Web3 Access', icon: 'link-2' },
  { label: 'Real-Time Events', icon: 'radio' },
  { label: 'Location Privacy', icon: 'map-pin' },
];

export function ArchitectureSection() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  return (
    <View style={styles.section} id="architecture">
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Architecture</Text>
          <Text style={styles.title}>One bridge between AI Agents and every App</Text>
          <Text style={styles.subtitle}>
            Open-Dome sits between autonomous agents and third-party modules, handling the complex security 
            handshakes, blockchain routing, and real-time messaging so developers can focus on building experiences.
          </Text>
        </View>

        {/* Architecture Flow Diagram */}
        <View style={styles.diagram}>
          <View style={[styles.diagramFlow, !isDesktop && styles.diagramFlowMobile]}>
            {/* Host App Node */}
            <View style={styles.nodeHost}>
              <View style={styles.nodeIconWrap}>
                <Feather name="smartphone" size={24} color="#F9F9F8" />
              </View>
              <Text style={styles.nodeTitle}>Host App</Text>
              <Text style={styles.nodeDesc}>The Agent / Host</Text>
            </View>

            {/* Connection Arrow */}
            <View style={[styles.connector, !isDesktop && styles.connectorMobile]}>
              <View style={styles.connectorLine} />
              <View style={styles.connectorLabel}>
                <Text style={styles.connectorLabelText}>Injects user data, GPS & wallet addresses</Text>
              </View>
              <View style={styles.connectorArrow}>
                <Feather name={isDesktop ? 'arrow-right' : 'arrow-down'} size={16} color="#0033A0" />
              </View>
            </View>

            {/* Bridge Node */}
            <View style={styles.nodeBridge}>
              <View style={styles.bridgeHeader}>
                <View style={styles.bridgeIconWrap}>
                  <Feather name="cpu" size={18} color="#0033A0" />
                </View>
                <Text style={styles.bridgeTitle}>Open-Dome Infrastructure</Text>
              </View>
              <View style={[styles.bridgeHandles, !isDesktop && styles.bridgeHandlesMobile]}>
                {BRIDGE_HANDLES.map((handle) => (
                  <View key={handle.label} style={styles.handleItem}>
                    <Feather name={handle.icon} size={13} color="#A1A1A6" />
                    <Text style={styles.handleLabel}>{handle.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Connection Arrow */}
            <View style={[styles.connector, !isDesktop && styles.connectorMobile]}>
              <View style={styles.connectorLine} />
              <View style={styles.connectorLabel}>
                <Text style={styles.connectorLabelText}>Plug & Play SDK</Text>
              </View>
              <View style={styles.connectorArrow}>
                <Feather name={isDesktop ? 'arrow-right' : 'arrow-down'} size={16} color="#0033A0" />
              </View>
            </View>

            {/* Mini-App Node */}
            <View style={styles.nodeMiniApp}>
              <View style={styles.nodeIconWrap}>
                <Feather name="package" size={24} color="#F9F9F8" />
              </View>
              <Text style={styles.nodeTitle}>Mini-App</Text>
              <Text style={styles.nodeDesc}>Third-Party Module</Text>
            </View>
          </View>
        </View>

        {/* Bottom note */}
        <View style={styles.note}>
          <Text style={styles.noteText}>
            Token verification happens exclusively on the server. The raw token list is never exposed to the client. 
            JWTs are generated fresh per session with HS512 signing and 1-day expiry.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    backgroundColor: '#0A0A0C',
  },
  inner: {
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 120,
    paddingHorizontal: 32,
  },
  header: {
    maxWidth: 720,
    gap: 16,
    marginBottom: 80,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0033A0',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 'clamp(2rem, 3.5vw, 3rem)' as any : 32,
    fontWeight: '700',
    color: '#F9F9F8',
    letterSpacing: -1,
    lineHeight: Platform.OS === 'web' ? '1.15em' as any : 38,
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 28,
    color: '#A1A1A6',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  diagram: {
    width: '100%',
    paddingVertical: 24,
  },
  diagramFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  diagramFlowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  nodeHost: {
    backgroundColor: '#141416',
    borderWidth: 1,
    borderColor: 'rgba(249, 249, 248, 0.08)',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    minWidth: 140,
  },
  nodeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(249, 249, 248, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9F9F8',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  nodeDesc: {
    fontSize: 12,
    color: '#71717A',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  connector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    minWidth: 80,
    flex: 1,
    gap: 0,
  },
  connectorMobile: {
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  connectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(249, 249, 248, 0.12)',
  },
  connectorLabel: {
    paddingHorizontal: 8,
  },
  connectorLabelText: {
    fontSize: 10,
    color: '#71717A',
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  connectorArrow: {
    paddingHorizontal: 4,
  },
  nodeBridge: {
    backgroundColor: '#141416',
    borderWidth: 2,
    borderColor: '#0033A0',
    borderRadius: 16,
    padding: 28,
    gap: 20,
    minWidth: 280,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 40px rgba(0, 51, 160, 0.15)',
    } : {}),
  },
  bridgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bridgeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 51, 160, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bridgeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F9F9F8',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  bridgeHandles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bridgeHandlesMobile: {
    flexDirection: 'column',
  },
  handleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(249, 249, 248, 0.04)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(249, 249, 248, 0.06)',
  },
  handleLabel: {
    fontSize: 12,
    color: '#A1A1A6',
    fontWeight: '500',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  nodeMiniApp: {
    backgroundColor: '#141416',
    borderWidth: 1,
    borderColor: 'rgba(249, 249, 248, 0.08)',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    minWidth: 140,
  },
  note: {
    marginTop: 64,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(249, 249, 248, 0.06)',
    maxWidth: 680,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 22,
    color: '#71717A',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
});
