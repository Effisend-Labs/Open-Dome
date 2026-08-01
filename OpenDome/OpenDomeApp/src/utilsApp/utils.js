import AsyncStorage from "@react-native-async-storage/async-storage";
import * as EncryptedStorage from "expo-secure-store";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, PixelRatio, Platform } from "react-native";

export async function getAsyncStorageValue(label, storage = "General") {
  try {
    const session = await AsyncStorage.getItem(storage);
    if (label in JSON.parse(session)) {
      return JSON.parse(session)[label];
    } else {
      return null;
    }
  } catch {
    return null;
  }
}

export async function setAsyncStorageValue(value, storage = "General") {
  const session = await AsyncStorage.getItem(storage);
  await AsyncStorage.setItem(
    storage,
    JSON.stringify({
      ...JSON.parse(session),
      ...value,
    }),
  );
}

export async function getEncryptedStorageValue(label, storage = "General") {
  try {
    const session = await EncryptedStorage.getItem(storage);
    if (label in JSON.parse(session)) {
      return JSON.parse(session)[label];
    } else {
      return null;
    }
  } catch {
    try {
      const session = await AsyncStorage.getItem(storage + "Backup");
      if (label in JSON.parse(session)) {
        return JSON.parse(session)[label];
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }
}

export async function setEncryptedStorageValue(value, storage = "General") {
  try {
    const session = await EncryptedStorage.getItem(storage);
    await EncryptedStorage.setItem(
      storage,
      JSON.stringify({
        ...JSON.parse(session),
        ...value,
      }),
    );
  } catch {
    const session = await AsyncStorage.getItem(storage + "Backup");
    await AsyncStorage.setItem(
      storage + "Backup",
      JSON.stringify({
        ...JSON.parse(session),
        ...value,
      }),
    );
  }
}

export async function nukeStorage(storage = "General") {
  try {
    await AsyncStorage.clear();
    await clearSecureStorage(storage);
  } catch {
    console.log("Failed to clear AsyncStorage");
  }
}

export async function clearSecureStorage(storage) {
  try {
    await EncryptedStorage.deleteItemAsync(storage);
  } catch {
    console.log("Failed to clear EncryptedStorage");
  }
}

export function epsilonRound(num, zeros = 4) {
  let temp = num;
  if (typeof num === "string") {
    temp = parseFloat(num);
  }
  return (
    Math.round((temp + Number.EPSILON) * Math.pow(10, zeros)) /
    Math.pow(10, zeros)
  );
}

export const normalizeFontSize = (size) => {
  let { width, height } = Dimensions.get("window");
  if (Platform.OS === "web" && height / width < 1) {
    width /= 2.3179;
    height *= 0.7668;
  }
  const scale = width / 375;
  const factor = 0.4;
  const moderateScale = 1 + (scale - 1) * factor;
  // Clamp the scale between 0.85 (min) and 1.2 (max) to prevent overlapping layouts
  const clampedScale = Math.max(0.85, Math.min(1.2, moderateScale));
  return PixelRatio.roundToNearestPixel(size * clampedScale);
};

export function useStateAsync(initialValue) {
  const [state, setState] = useState(initialValue);
  const resolverRef = useRef(null);

  const asyncSetState = useCallback((newValue) => {
    setState(newValue);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  // Resolve the promise after state updates
  useEffect(() => {
    if (resolverRef.current) {
      resolverRef.current(state);
      resolverRef.current = null;
    }
  }, [state]);

  return [state, asyncSetState];
}
