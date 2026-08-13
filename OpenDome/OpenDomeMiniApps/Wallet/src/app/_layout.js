import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

/** Slot avoids Stack's deprecated pointerEvents prop warning on web. */
export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Slot />
      <StatusBar style="auto" />
    </View>
  );
}
