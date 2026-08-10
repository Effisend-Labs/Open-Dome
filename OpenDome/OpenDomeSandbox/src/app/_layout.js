import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { Head } from 'expo-router';
LogBox.ignoreLogs([
  '"shadow*" style props are deprecated',
]);


export default function RootLayout() {
  return (
    <>
      <Head>
        <title>OpenDome Sandbox</title>
      </Head>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
