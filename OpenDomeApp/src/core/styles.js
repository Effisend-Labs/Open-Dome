/**
 * @deprecated This file is a compatibility shim. New code should import
 * from `./tokens` instead. The old "Luxury Dark" gold palette is no longer
 * used in the live app.
 */
import { colors, type as typeTokens } from "./tokens";

export const backgroundColor = colors.bg.canvas;
export const cardColor       = colors.bg.card;
export const accentColor     = colors.brand.primary;
export const whiteColor      = colors.text.primary;
export const textSecondary   = colors.text.secondary;
export const borderColor     = colors.border.default;

export const headerHeight = 84;
export const footerHeight = 64;

import { Dimensions, StatusBar, StyleSheet } from "react-native";

export const screenHeight = Dimensions.get("screen").height;
export const windowHeight = Dimensions.get("window").height;
export const ratio =
  Dimensions.get("window").height / Dimensions.get("window").width;
export const mainHeight =
  Dimensions.get("window").height -
  (headerHeight + footerHeight + (ratio > 1.7 ? 0 : (StatusBar.currentHeight ?? 0)));
export const StatusBarHeight = StatusBar.currentHeight ?? 0;

export const createGlobalStyles = ({ normalize }) => {
  const baseText = {
    color: whiteColor,
    fontFamily: "Exo2_400Regular",
  };
  const baseBoldText = {
    ...baseText,
    fontFamily: "Exo2_700Bold",
  };

  return StyleSheet.create({
    container: { flex: 1, backgroundColor },
    header: {
      height: normalize(headerHeight),
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: normalize(24),
      borderBottomWidth: 1,
      borderBottomColor: borderColor,
    },
    main: { flex: 1, width: "100%" },
    footer: {
      width: "100%",
      height: normalize(footerHeight),
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: borderColor,
    },
    heroTitle: { ...baseBoldText, fontSize: normalize(typeTokens.h1), letterSpacing: -1 },
    sectionHeader: {
      ...baseBoldText,
      fontSize: normalize(typeTokens.h3),
      color: accentColor,
      textTransform: "uppercase",
      letterSpacing: 1.5,
    },
    bodyText: { ...baseText, fontSize: normalize(typeTokens.base), color: textSecondary },
    labelSmall: {
      ...baseText,
      fontSize: normalize(typeTokens.small),
      color: textSecondary,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    card: {
      backgroundColor: cardColor,
      borderRadius: normalize(16),
      padding: normalize(20),
      borderWidth: 1,
      borderColor,
    },
    primaryButton: {
      backgroundColor: accentColor,
      borderRadius: normalize(12),
      paddingVertical: normalize(16),
      paddingHorizontal: normalize(32),
      alignItems: "center",
      justifyContent: "center",
    },
    buttonText: { ...baseBoldText, color: backgroundColor, fontSize: normalize(typeTokens.base) },
    textAccent: { color: accentColor },
    textWhite: { color: whiteColor },
  });
};
