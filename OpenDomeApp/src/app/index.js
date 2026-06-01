// Basic Imports
import { Image } from "expo-image";
import { useNavigation } from "expo-router";
import { useContext, useEffect } from "react";
import { View } from "react-native";
import logoSplash from "../assets/logo.png";
import { createGlobalStyles } from "../core/styles";
import ContextModule from "../providers/contextModule";
import { useSmartSize } from "../providers/smartProvider";

export default function SplashLoading() {
  const context = useContext(ContextModule);
  const smartSize = useSmartSize();
  const GlobalStyles = createGlobalStyles(smartSize);
  const navigation = useNavigation();

  useEffect(() => {
    context.value.starter && navigation.navigate("(screens)/main");
  }, [context.value.starter, navigation]);

  return (
    <View style={[GlobalStyles.container, { justifyContent: "center" }]}>
      <Image
        source={logoSplash}
        alt="Main Logo"
        contentFit="contain" 
        transition={200}     
        style={{
          width: "70%",
          aspectRatio: 1,    
        }}
      />
    </View>
  );
}
