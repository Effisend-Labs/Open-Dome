import React from 'react';
import { StyleSheet, View, Text, ScrollView, ImageBackground, FlatList, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import SecretScanner from '../../../components/SecretScanner';
import PressableScale from '../../../components/PressableScale';

const { width } = Dimensions.get('window');
const ACCENT = '#B026FF';

const UPCOMING_EVENTS = [
  { id: '1', title: 'Modern Art Expo', artist: 'CONTEMPORARY', date: 'DEC 01', image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=1000' },
  { id: '2', title: 'Digital Art', artist: 'TEAMLAB', date: 'JAN 15', image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000' },
];

export default function GalleryAaMoApp() {
  return (
    <View style={styles.container}>
      <SecretScanner tokens={{ BG: '#000', FG: '#FFF', ACCENT, BORDER: 'rgba(255,255,255,0.1)', SURFACE_ELEVATED: '#111', MUTED: '#444' }} />
      
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* Massive Full-Bleed Hero Ticket */}
        <View style={styles.heroWrapper}>
          <ImageBackground 
            source={{ uri: 'https://images.unsplash.com/photo-1544928147-79a2dbc1f389?q=80&w=1000' }} 
            style={styles.heroBg}
          >
            <LinearGradient 
              colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)', '#000']} 
              style={styles.heroGradient}
            >
              <View style={styles.heroContent}>
                <View style={styles.liveBadge}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.liveText}>YOUR ACTIVE PASS</Text>
                </View>
                <Text style={styles.heroHeadline}>VAN GOGH\nIMMERSIVE</Text>
                <Text style={styles.heroSub}>TODAY • ENTRY 14:00</Text>
                
                <PressableScale style={styles.qrButton}>
                  <Ionicons name="qr-code" size={24} color="#000" />
                  <Text style={styles.qrButtonText}>SHOW TICKET</Text>
                </PressableScale>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Horizontal Events Carousel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UPCOMING AT GALLERY AaMo</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            data={UPCOMING_EVENTS}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <PressableScale style={styles.carouselCard}>
                <ImageBackground source={{ uri: item.image }} style={styles.carouselBg} imageStyle={{ borderRadius: 16 }}>
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.carouselGradient}>
                    <Text style={styles.carouselDate}>{item.date}</Text>
                    <Text style={styles.carouselArtist}>{item.artist}</Text>
                    <Text style={styles.carouselTitle}>{item.title}</Text>
                  </LinearGradient>
                </ImageBackground>
              </PressableScale>
            )}
          />
        </View>

        {/* Entertainment Venue Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VENUE EXPERIENCE</Text>
          <View style={styles.grid}>
            <PressableScale style={[styles.gridBox, { backgroundColor: '#111' }]}>
              <Ionicons name="fast-food" size={32} color={ACCENT} style={{ marginBottom: 12 }} />
              <Text style={styles.gridTitle}>Order Food</Text>
              <Text style={styles.gridSub}>Delivery to Seat 104</Text>
            </PressableScale>
            <PressableScale style={[styles.gridBox, { backgroundColor: '#111' }]}>
              <Ionicons name="map" size={32} color={ACCENT} style={{ marginBottom: 12 }} />
              <Text style={styles.gridTitle}>3D Map</Text>
              <Text style={styles.gridSub}>Find restrooms & merch</Text>
            </PressableScale>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  heroWrapper: { width: '100%', height: 500 },
  heroBg: { flex: 1, justifyContent: 'flex-end' },
  heroGradient: { height: 350, justifyContent: 'flex-end', padding: 24, paddingBottom: 40 },
  heroContent: { alignItems: 'flex-start' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT, marginRight: 8 },
  liveText: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#FFF' },
  heroHeadline: { fontSize: 48, fontWeight: '800', color: '#FFF', letterSpacing: -1, lineHeight: 50, marginBottom: 8, fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif' },
  heroSub: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)', letterSpacing: 1, marginBottom: 32 },
  qrButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: ACCENT, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 30 },
  qrButtonText: { fontSize: 15, fontWeight: '700', color: '#000', marginLeft: 10, letterSpacing: 0.5 },
  
  section: { marginTop: 20, marginBottom: 40 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#888', letterSpacing: 1.5, marginLeft: 24, marginBottom: 16 },
  
  carouselCard: { width: 280, height: 200, marginRight: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111' },
  carouselBg: { flex: 1 },
  carouselGradient: { flex: 1, justifyContent: 'flex-end', padding: 16 },
  carouselDate: { fontSize: 11, fontWeight: '700', color: ACCENT, letterSpacing: 1, marginBottom: 4 },
  carouselArtist: { fontSize: 22, fontWeight: '700', color: '#FFF', letterSpacing: -0.5 },
  carouselTitle: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },
  
  grid: { flexDirection: 'row', paddingHorizontal: 20, gap: 16 },
  gridBox: { flex: 1, padding: 24, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  gridTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  gridSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)' }
});
