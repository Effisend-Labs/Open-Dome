import { Platform } from 'react-native';

/** Native driver is unavailable on RN Web — always use JS driver there. */
export const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Cross-platform shadow. Web uses `boxShadow` (shadow* props are deprecated).
 */
export function boxShadow({
  color = '#000',
  offsetX = 0,
  offsetY = 2,
  blur = 8,
  opacity = 0.1,
  elevation = 2,
} = {}) {
  if (Platform.OS === 'web') {
    const rgba =
      color === 'transparent'
        ? 'transparent'
        : color.startsWith('#')
          ? hexToRgba(color, opacity)
          : color;
    return {
      boxShadow: `${offsetX}px ${offsetY}px ${blur}px ${rgba}`,
    };
  }

  return {
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: blur,
    elevation,
  };
}

function hexToRgba(hex, alpha) {
  const raw = String(hex).replace('#', '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(0,0,0,${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
