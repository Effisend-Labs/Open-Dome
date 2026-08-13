import frame from "../assets/frame.png";
import { Image } from "expo-image";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Dimensions, Keyboard, PixelRatio, Platform, View } from "react-native";
import { Toaster } from "react-native-sonner";

// DONT CHANGE THIS VALUES (Its fixed)
const frameWidthRatio = 0.4566;
const frameHeightRatio = 0.9726;
const KEYBOARD_HEIGHT_DELTA = 80;

const SmartSizeContext = createContext({
  width: 0,
  height: 0,
  scale: 1,
  normalize: (size) => size,
  keyboardInset: 0,
});

function readWebKeyboardInset(layoutHeight) {
  if (typeof window === "undefined" || !window.visualViewport) return 0;
  const vv = window.visualViewport;
  const base = layoutHeight || window.innerHeight;
  return Math.max(0, base - vv.height - vv.offsetTop);
}

export const useSmartSize = () => useContext(SmartSizeContext);

function isKeyboardResize(prev, next) {
  if (!prev || !next) return false;
  const sameWidth = Math.round(prev.width) === Math.round(next.width);
  const heightDelta = Math.abs(prev.height - next.height);
  return sameWidth && heightDelta >= KEYBOARD_HEIGHT_DELTA;
}

export default function SmartProvider({ children }) {
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [windowDimensions, setWindowDimensions] = useState(
    Dimensions.get("window"),
  );
  const [isMounted, setIsMounted] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const layoutHeightRef = React.useRef(windowDimensions.height);
  layoutHeightRef.current = windowDimensions.height;

  useEffect(() => {
    setIsMounted(true);
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setWindowDimensions((prev) => {
        // Mobile keyboard shrinks window height only. Treating that as a
        // layout/orientation change remounts the whole app (looks like a crash).
        if (isKeyboardResize(prev, window)) return prev;
        if (
          Math.round(prev.width) === Math.round(window.width) &&
          Math.round(prev.height) === Math.round(window.height)
        ) {
          return prev;
        }
        return window;
      });
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const applyInset = (next) => {
      const value = Math.max(0, Math.round(next || 0));
      setKeyboardInset((prev) => (Math.abs(prev - value) < 8 ? prev : value));
    };

    if (Platform.OS === "web") {
      if (typeof window === "undefined" || !window.visualViewport) return undefined;
      const vv = window.visualViewport;
      const onChange = () => applyInset(readWebKeyboardInset(layoutHeightRef.current));
      onChange();
      vv.addEventListener("resize", onChange);
      vv.addEventListener("scroll", onChange);
      window.addEventListener("resize", onChange);
      return () => {
        vv.removeEventListener("resize", onChange);
        vv.removeEventListener("scroll", onChange);
        window.removeEventListener("resize", onChange);
      };
    }

    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      applyInset(e.endCoordinates?.height || 0);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => applyInset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const ratio = windowDimensions.height / windowDimensions.width;
  // Frame only after client mount to avoid SSR hydration mismatch (#418).
  // Landscape web (desktop) gets the phone bezel; portrait phones do not.
  const isWebMobileView = isMounted ? Platform.OS === "web" && ratio < 1 : false;

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

  const providerValue = useMemo(
    () => ({ ...internalSize, keyboardInset }),
    [internalSize, keyboardInset],
  );

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

  const toasterOptions = {
    toastOptions: {
      style: {
        borderRadius: 0,
        borderWidth: 2,
        borderColor: "#000000",
        backgroundColor: "#F9F9F6",
        padding: 12,
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

  // Same View tree in both modes so flipping the bezel never remounts routes.
  return (
    <SmartSizeContext.Provider value={providerValue}>
      <View
        style={{
          flex: 1,
          backgroundColor: "black",
          justifyContent: isWebMobileView ? "center" : undefined,
          alignItems: isWebMobileView ? "center" : undefined,
        }}
      >
        <View
          style={
            isWebMobileView
              ? {
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  alignSelf: "center",
                  justifyContent: "center",
                  backgroundColor: "black",
                }
              : { flex: 1, backgroundColor: "black" }
          }
        >
          <View
            style={
              isWebMobileView
                ? {
                    width: internalSize.width,
                    height: `${frameHeightRatio * 100}%`,
                    alignSelf: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    borderRadius: internalSize.normalize(50),
                  }
                : { flex: 1 }
            }
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
          {isWebMobileView ? (
            <Image
              source={frame}
              onLayout={handleLayout}
              contentFit="contain"
              pointerEvents={Platform.OS !== "web" ? "none" : undefined}
              style={[
                {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  zIndex: 10,
                  backgroundColor: "transparent",
                },
                Platform.OS === "web" && { pointerEvents: "none" },
              ]}
            />
          ) : null}
        </View>
      </View>
    </SmartSizeContext.Provider>
  );
}
