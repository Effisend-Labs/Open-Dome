import '../core/polyfills';
import { ContextProvider } from "../providers/contextModule";

import SmartProvider from "../providers/smartProvider";
import {
  Exo2_400Regular,
  Exo2_700Bold,
  useFonts,
} from "@expo-google-fonts/exo-2";
import { Stack } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";
import React from "react";
import "react-native-reanimated";
import "../core/error";
import ContextLoader from "../providers/contextLoader";
import { ThemeProvider } from "../providers/ThemeProvider";
import { LogBox } from 'react-native';
LogBox.ignoreLogs([
  '"shadow*" style props are deprecated',
]);


export default function RootLayout() {
  useFonts({
    Exo2_400Regular,
    Exo2_700Bold,
  });
  return (
    <React.Fragment>
      <Head>
        <title>OpenDome App</title>
      </Head>
      {
        // This provider put a phone frame around the app if the app is running on a desktop
      }
      <ThemeProvider>
        <SmartProvider>
          {
            // This provider provides the context to the app
          }
          <ContextProvider>
            {
              // This provider provides metamask connectivity
            }
            <ContextLoader />
            {
              // Base App Analytics
            }
            <Stack
              initialRouteName="index"
              screenOptions={{
                animation: "simple_push",
                headerShown: false,
                contentStyle: { backgroundColor: "black" },
              }}
            >
              {
                // Splash Loading Screen
              }
              <Stack.Screen name="index" options={{ title: 'OpenDome App' }} />
              <Stack.Screen name="(screens)/main" options={{ title: 'OpenDome App' }} />
              <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
            </Stack>
            <StatusBar style="auto" />
          </ContextProvider>
        </SmartProvider>
      </ThemeProvider>
    </React.Fragment>
  );
}
