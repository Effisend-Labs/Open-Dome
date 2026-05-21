import { Image } from "expo-image";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Dimensions, PixelRatio, Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Toaster } from "react-native-sonner";
import frame from "../assets/frame.png";

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
  const isWebMobileView = isMounted ? Platform.OS === "web" : false;

  // 3. Calculate the internal "smartphone" dimensions
  const internalSize = useMemo(() => {
    let width, height;
    if (!isWebMobileView) {
      width = windowDimensions.width;
      height = windowDimensions.height;
    } else {
      width = frameSize.height * frameWidthRatio;
      height = frameSize.height * frameHeightRatio;
    }

    const baseScale = width / 375;
    const factor = 0.4;
    const moderateScale = 1 + (baseScale - 1) * factor;
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

  return (
    <SafeAreaProvider>
      <SmartSizeContext.Provider value={internalSize}>
        {/* Minimal padding to maximize device size */}
        <View style={{ flex: 1, backgroundColor: "transparent", justifyContent: "center", alignItems: "center", paddingVertical: 10 }}>

          {/* Master Container: Locks the screen and frame together proportionally */}
          <View
            style={{
              height: '100%', // Maximize height to fill the stage
              aspectRatio: 0.47, // Core iPhone aspect ratio
              justifyContent: "center",
              alignItems: "center",
              // Premium Apple-style depth
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 32 },
              shadowOpacity: 0.15,
              shadowRadius: 64,
              elevation: 20,
              borderRadius: 1000,
            }}
          >
            {/* The Active Screen (Content Area) */}
            <View
              style={{
                position: "absolute",
                width: '95%', // Increased to close side gaps
                height: '98%',  // Slightly increased to fill top/bottom bezels better
                borderRadius: internalSize.normalize(38),
                overflow: "hidden",
                backgroundColor: "#000",
                zIndex: 1
              }}
            >
              {children}
              <Toaster
                toastStyles={{
                  container: {
                    width: '90%',
                    alignSelf: "center",
                  },
                }}
              />
            </View>

            {/* The Physical Device Frame PNG */}
            <Image
              source={frame}
              contentFit="fill" // Uses fill because the parent container now perfectly dictates the aspect ratio
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                zIndex: 10,
                backgroundColor: "transparent",
                pointerEvents: "none",
              }}
            />
          </View>
        </View>
      </SmartSizeContext.Provider>
    </SafeAreaProvider>
  );
}
