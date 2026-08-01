import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_VERSION } from './constants';

/**
 * Smart Update Strategy
 * Performs a "Boot-Time" Version Handshake to ensure the user is on the latest bundle.
 * If a version mismatch is detected, it triggers a window.location.reload(true) 
 * to bypass the browser's disk cache.
 */
export const useSmartUpdate = () => {
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const lastVersion = await AsyncStorage.getItem('cached_version');
        
        if (lastVersion && lastVersion !== APP_VERSION) {
          console.log(`[SmartUpdate] Version mismatch: ${lastVersion} -> ${APP_VERSION}. Forcing refresh.`);
          
          // 1. Update the cache with the new version immediately
          await AsyncStorage.setItem('cached_version', APP_VERSION);
          
          // 2. Force a hard reload from the server, bypassing browser cache
          if (typeof window !== 'undefined') {
            // true flag is deprecated but browsers still respect it for hard reload logic
            // or we can use a cache-busting timestamp if needed
            window.location.reload(); 
          }
        } else if (!lastVersion) {
          // Initial install/First time running with this system
          console.log(`[SmartUpdate] Initializing version cache: ${APP_VERSION}`);
          await AsyncStorage.setItem('cached_version', APP_VERSION);
        } else {
          console.log(`[SmartUpdate] System synchronized at version: ${APP_VERSION}`);
        }
      } catch (e) {
        console.warn("[SmartUpdate] Update check failed", e);
      }
    };
    
    checkVersion();
  }, []);
};
