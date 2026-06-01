import frame from "../assets/frame.png";
import { Image } from "expo-image";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Dimensions, PixelRatio, Platform, View } from "react-native";
import { Toaster } from "react-native-sonner";

// DONT CHANGE THIS VALUES (Its fixed)
const frameWidthRatio = 0.4566; 
const frameHeightRatio = 0.9726;  

// 1. Create the Context
const SmartSizeContext = createContext({
  width: 0,
  height: 0,
  scale: 1,
  normalize: (size) => size,
});

// 2. Export the Hook
export const useSmartSize = () => useContext(SmartSizeContext);

export default function SmartProvider({ children }) {
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [windowDimensions, setWindowDimensions] = useState(
    Dimensions.get("window"),
  );
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setWindowDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const ratio = windowDimensions.height / windowDimensions.width;
  // Ensure the frame is only added after the component has mounted on the client.
  // This prevents hydration mismatches (React error #418) between the server and the first render.
  const isWebMobileView = isMounted ? Platform.OS === "web" && ratio < 1 : false;

  // 3. Calculate the internal "smartphone" dimensions
  // These are the dimensions the children actually see
  const internalSize = useMemo(() => {
    let width, height;
    if (!isWebMobileView) {
      width = windowDimensions.width;
      height = windowDimensions.height;
    } else {
      width = frameSize.height * frameWidthRatio;
      height = frameSize.height * frameHeightRatio; 
    }

    // Scale primarily based on width to avoid height-distortion on vertical screens.
    const baseScale = width / 375;
    // Apply a moderation factor (0 = no scale, 1 = full linear scale) to prevent extreme sizes
    const factor = 0.4; // Adjust this value (0 to 1) to fine-tune the moderation
    const moderateScale = 1 + (baseScale - 1) * factor;
    // Clamp the scale to a safe range to prevent undersizing on tiny screens or oversizing on tablets
    const clampedScale = Math.max(0.85, Math.min(1.2, moderateScale));
    const normalize = (size) => PixelRatio.roundToNearestPixel(size * clampedScale);

    return {
      width,
      height,
      scale: clampedScale,
      normalize,
    };
  }, [frameSize, windowDimensions, isWebMobileView]);

  const handleLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    // Optimization: Only update if the integer value changed (prevents loops)
    setFrameSize((prev) => {
      if (
        Math.round(prev.width) === Math.round(width) &&
        Math.round(prev.height) === Math.round(height)
      ) {
        return prev;
      }
      return { width, height };
    });
  };

  const toasterOptions = {
    toastOptions: {
      style: {
        borderRadius: 0,
        borderWidth: 2,
        borderColor: "#000000",
        backgroundColor: "#F9F9F6",
        padding: 12,
        // Hard shadows for brutalist look
        shadowColor: "#000000",
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
      },
      titleStyle: {
        color: "#000000",
        fontWeight: "700",
        fontSize: internalSize.normalize(14),
      },
      descriptionStyle: {
        color: "#000000",
        fontSize: internalSize.normalize(12),
      },
    },
  };

  return (
    <SmartSizeContext.Provider value={internalSize}>
      {isWebMobileView ? (
        <View style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
          <View
            style={{
              position: "absolute",
              width: `100%`,
              height: `100%`,
              alignSelf: "center",
              justifyContent: "center",
              backgroundColor: "black",
            }}
          >
            <View
              style={{
                width: internalSize.width,
                height: `${frameHeightRatio * 100}%`,
                alignSelf: "center",
                justifyContent: "center",
                overflow: "hidden",
                paddingVertical: 20,
              }}
            >
              {children}
              <Toaster
                {...toasterOptions}
                containerStyle={{
                  width: internalSize.width * 0.9,
                  alignSelf: "center",
                }}
              />
            </View>
             <Image
            source={frame}
            onLayout={handleLayout}
            contentFit="contain"
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: 10,
              backgroundColor: "transparent",
            }}
          />
          </View>
        </View>
      ) : (
          <View style={{ flex: 1, backgroundColor: "black" }}>
            {children}
            <Toaster
              {...toasterOptions}
              containerStyle={{
                width: internalSize.width * 0.9,
                alignSelf: "center",
              }}
            />
          </View>
      )}
    </SmartSizeContext.Provider>
  );
}
