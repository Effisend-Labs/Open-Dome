import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { useSmartSize } from '../providers/smartProvider';
import { THEMES } from '../providers/ThemeProvider';

export default function VectorBackground({ themeId, theme }) {
  const { normalize: n } = useSmartSize();
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: false,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 10000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [floatAnim]);

  const floatInterpolate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, n(20)],
  });

  const renderPastelKawaii = () => (
    <>
      {/* Soft floating clouds/circles */}
      <Animated.View style={[s.shape, s.circle, { top: '15%', left: '10%', width: n(150), height: n(150), backgroundColor: theme.bg.blob1, transform: [{ translateY: floatInterpolate }] }]} />
      <Animated.View style={[s.shape, s.circle, { bottom: '25%', right: '5%', width: n(200), height: n(200), backgroundColor: theme.bg.blob2, transform: [{ translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [n(20), 0] }) }] }]} />
      <View style={[s.shape, s.star, { top: '40%', right: '20%', borderBottomColor: theme.text.accent }]} />
    </>
  );

  const renderSynthwave = () => (
    <>
      {/* Cyberpunk Grid */}
      <View style={{ ...StyleSheet.absoluteFillObject, opacity: 0.15, backgroundColor: 'transparent', backgroundImage: 'linear-gradient(#00F0FF 1px, transparent 1px), linear-gradient(90deg, #00F0FF 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      {/* Distant Cyber Sun */}
      <View style={[s.shape, s.sun, { bottom: '-10%', alignSelf: 'center', backgroundColor: '#FF003C', shadowColor: '#FF003C', shadowOpacity: 1, shadowRadius: 50 }]} />
      {/* Glowing Triangle */}
      <View style={[s.shape, s.triangle, { top: '20%', left: '10%', borderBottomColor: '#00F0FF', transform: [{ scale: 1.5 }, { rotate: '15deg' }] }]} />
    </>
  );

  const renderAlpineFrost = () => (
    <>
      {/* Jagged Ice Peaks using rotated squares */}
      <Animated.View style={[s.shape, s.diamond, { bottom: '-5%', left: '-10%', width: n(300), height: n(300), backgroundColor: 'rgba(255,255,255,0.1)', transform: [{ rotate: '45deg' }, { translateY: floatInterpolate }] }]} />
      <Animated.View style={[s.shape, s.diamond, { bottom: '-15%', right: '-5%', width: n(400), height: n(400), backgroundColor: 'rgba(255,255,255,0.05)', transform: [{ rotate: '45deg' }, { translateY: floatInterpolate }] }]} />
      <View style={[s.shape, s.circle, { top: '10%', right: '15%', width: n(80), height: n(80), backgroundColor: 'transparent', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' }]} />
    </>
  );

  const renderDeepSpace = () => (
    <>
      {/* Orbital Rings */}
      <View style={[s.shape, s.circle, { top: '-20%', right: '-20%', width: n(600), height: n(600), backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }]} />
      <View style={[s.shape, s.circle, { top: '-10%', right: '-10%', width: n(400), height: n(400), backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }]} />
      {/* Distant Planet/Moon */}
      <Animated.View style={[s.shape, s.circle, { bottom: '15%', left: '10%', width: n(120), height: n(120), backgroundColor: '#1C1C1E', shadowColor: '#FFF', shadowOpacity: 0.1, shadowRadius: 30, transform: [{ translateY: floatInterpolate }] }]} />
    </>
  );

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg.canvas, overflow: 'hidden', zIndex: 0 }]}>
      {themeId === THEMES.PASTEL && renderPastelKawaii()}
      {themeId === THEMES.SYNTHWAVE && renderSynthwave()}
      {themeId === THEMES.ALPINE && renderAlpineFrost()}
      {themeId === THEMES.DEEP_SPACE && renderDeepSpace()}
      
      {/* If any theme isn't covered, fallback to a subtle gradient or blobs */}
      {!Object.values(THEMES).includes(themeId) && (
         <View style={[s.shape, s.circle, { top: '10%', left: '-20%', width: n(300), height: n(300), backgroundColor: theme.bg.blob1 || 'rgba(255,255,255,0.05)' }]} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  shape: {
    position: 'absolute',
  },
  circle: {
    borderRadius: 9999,
  },
  diamond: {
    borderRadius: 20,
  },
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 50,
    borderRightWidth: 50,
    borderBottomWidth: 100,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'white',
  },
  sun: {
    width: 300,
    height: 150,
    borderTopLeftRadius: 150,
    borderTopRightRadius: 150,
    backgroundColor: 'red',
  },
  star: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 20,
    borderRightWidth: 20,
    borderBottomWidth: 40,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'white',
    transform: [{ rotate: '35deg' }],
  }
});
