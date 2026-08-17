import React, { useState } from 'react';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

/**
 * Store / springboard icon: remote mini-app app-icon.png, then bundled fallback.
 */
export function AppStoreIcon({
  app,
  iconSource,
  style,
  imageStyle,
  contentFit = 'contain',
  fallbackIcon = 'apps',
  fallbackIconSize = 26,
  fallbackIconColor,
  tintColor,
}) {
  const [remoteFailed, setRemoteFailed] = useState(false);
  const showRemote = Boolean(app?.iconUrl) && !remoteFailed;

  if (showRemote) {
    return (
      <Image
        source={{ uri: app.iconUrl }}
        style={[style, imageStyle, tintColor ? { tintColor } : null]}
        contentFit={contentFit}
        onError={() => setRemoteFailed(true)}
      />
    );
  }

  if (iconSource || app?.iconSource) {
    return (
      <Image
        source={iconSource || app.iconSource}
        style={[style, imageStyle]}
        contentFit={contentFit}
      />
    );
  }

  return (
    <Ionicons
      name={app?.icon || fallbackIcon}
      size={fallbackIconSize}
      color={fallbackIconColor}
    />
  );
}
