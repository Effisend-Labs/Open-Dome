import { Dimensions, StatusBar, StyleSheet } from "react-native";

export const screenHeight = Dimensions.get("screen").height;
export const windowHeight = Dimensions.get("window").height;

// ─── Luxury Dark Palette ──────────────────────────────────────────────────
export const backgroundColor = "#0A0A0A"; // Rich Black
export const cardColor = "#1C1C1E";       // Elevated surface
export const accentColor = "#D4AF37";     // Metallic Gold
export const whiteColor = "#FFFFFF";
export const textSecondary = "#8E8E93";
export const borderColor = "#2C2C2E";

export const headerHeight = 84;
export const footerHeight = 64;
export const ratio =
  Dimensions.get("window").height / Dimensions.get("window").width;
export const mainHeight =
  Dimensions.get("window").height -
  (headerHeight + footerHeight + (ratio > 1.7 ? 0 : (StatusBar.currentHeight ?? 0)));
export const StatusBarHeight = StatusBar.currentHeight ?? 0;

export const createGlobalStyles = ({ normalize }) => {
  const baseText = { 
    color: whiteColor, 
    fontFamily: "Exo2_400Regular"
  };
  const baseBoldText = { 
    ...baseText, 
    fontFamily: "Exo2_700Bold" 
  };

  return StyleSheet.create({
    // ─── Core Layout ──────────────────────────────────────────────────────────
    container: {
      flex: 1,
      backgroundColor,
    },
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
    main: {
      flex: 1,
      width: "100%",
    },
    footer: {
      width: "100%",
      height: normalize(footerHeight),
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: borderColor,
    },
    // ─── Typography (Luxury Minimalist) ───────────────────────────────────────
    heroTitle: {
      ...baseBoldText,
      fontSize: normalize(32),
      letterSpacing: -1,
    },
    sectionHeader: {
      ...baseBoldText,
      fontSize: normalize(18),
      color: accentColor,
      textTransform: "uppercase",
      letterSpacing: 1.5,
    },
    bodyText: {
      ...baseText,
      fontSize: normalize(16),
      color: textSecondary,
    },
    labelSmall: {
      ...baseText,
      fontSize: normalize(12),
      color: textSecondary,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    // ─── Template Components ──────────────────────────────────────────────────
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
    buttonText: {
      ...baseBoldText,
      color: backgroundColor,
      fontSize: normalize(16),
    },
    // ─── Utility ──────────────────────────────────────────────────────────────
    textAccent: { color: accentColor },
    textWhite: { color: whiteColor },
  });
};
