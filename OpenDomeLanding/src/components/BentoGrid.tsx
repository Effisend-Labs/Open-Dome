import React from 'react';
import { StyleSheet, Text, View, Platform, useWindowDimensions } from 'react-native';

export function BentoGrid() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 900;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>How It Works</Text>
        <Text style={styles.headerSubtitle}>
          Everything you need to integrate your service directly into the Super App.
        </Text>
      </View>
      
      <View style={[styles.grid, isLargeScreen && styles.gridLarge]}>
        
        {/* Item 1: The Concept / Host */}
        <View style={[styles.item, isLargeScreen && styles.featuredItem]}>
          <View style={styles.content}>
            <Text style={styles.itemTitle}>The Host Environment</Text>
            <Text style={styles.itemText}>
              Open-Dome creates a secure container inside the main app (the Host). Your Mini-App lives inside this container, sharing the same screen space and user base without you having to build a completely separate mobile application.
            </Text>
          </View>
        </View>
        
        {/* Item 2: The SDK */}
        <View style={styles.item}>
          <View style={styles.content}>
            <Text style={styles.itemTitle}>The SDK</Text>
            <Text style={styles.itemText}>
              A simple toolkit that lets your Mini-App talk to the Host. Easily request the user's location, trigger payments, or send notifications with just a few lines of code.
            </Text>
          </View>
        </View>

        {/* Item 3: Security */}
        <View style={styles.item}>
          <View style={styles.content}>
            <Text style={styles.itemTitle}>Strict Security</Text>
            <Text style={styles.itemText}>
              Every time a user opens your Mini-App, the Host automatically verifies your app is safe. Users can trust your service instantly because they never leave the Super App.
            </Text>
          </View>
        </View>

        {/* Item 4: The Sandbox */}
        <View style={[styles.item, isLargeScreen && styles.wideItem]}>
          <View style={styles.content}>
            <Text style={styles.itemTitle}>The Visual Sandbox</Text>
            <Text style={styles.itemText}>
              Before you launch, test your Mini-App in our powerful web Sandbox. See exactly how it looks in dark mode, light mode, and different languages, ensuring a perfect experience for every user.
            </Text>
          </View>
        </View>
        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 120,
    paddingHorizontal: 32,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 80,
    maxWidth: 800,
    gap: 16,
  },
  headerTitle: {
    fontSize: Platform.OS === 'web' ? 'clamp(2.5rem, 4vw, 3.5rem)' : 40,
    fontWeight: '700',
    color: '#0A0A0C',
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 20,
    color: '#4A4A4D',
    lineHeight: 32,
  },
  grid: {
    flexDirection: 'column',
    gap: 24, 
  },
  gridLarge: {
    ...(Platform.OS === 'web' 
      ? {
          display: 'grid' as any,
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(2, minmax(280px, auto))',
        }
      : {
          flexDirection: 'row',
          flexWrap: 'wrap',
        }
    ),
  },
  item: {
    backgroundColor: '#FFFFFF', // Pure white for contrast against off-white background
    borderWidth: 1,
    borderColor: 'rgba(10, 10, 12, 0.05)',
    borderRadius: 16, 
    padding: 48,
    gap: 32,
    ...(Platform.OS !== 'web' ? { width: '100%' } : {}),
  },
  featuredItem: {
    ...(Platform.OS === 'web' 
      ? {
          gridColumn: 'span 2',
          gridRow: 'span 1',
        }
      : { width: '66%' }
    ),
  },
  wideItem: {
    ...(Platform.OS === 'web' 
      ? {
          gridColumn: 'span 2',
          gridRow: 'span 1',
        }
      : { width: '66%' }
    ),
  },
  content: {
    gap: 16,
  },
  itemTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0A0A0C',
    letterSpacing: -0.5,
  },
  itemText: {
    fontSize: 16,
    lineHeight: 28,
    color: '#4A4A4D',
  },
});
