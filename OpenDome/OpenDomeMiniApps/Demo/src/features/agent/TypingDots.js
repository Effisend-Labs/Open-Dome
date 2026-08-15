import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

export function TypingDots({ color }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 320, easing: Easing.out(Easing.ease), useNativeDriver: false }),
          Animated.timing(dot, { toValue: 0, duration: 320, easing: Easing.in(Easing.ease), useNativeDriver: false }),
          Animated.delay(600 - delay),
        ])
      );
    animate(dot1, 0).start();
    animate(dot2, 160).start();
    animate(dot3, 320).start();
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim) => ({
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color,
    marginHorizontal: 2,
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
    </View>
  );
}
