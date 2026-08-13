import { Platform } from 'react-native';

export const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export function boxShadow({
  color = '#000',
  offsetX = 0,
  offsetY = 2,
  blur = 8,
  opacity = 0.1,
  elevation = 2,
} = {}) {
  if (Platform.OS === 'web') {
    const rgba = color.startsWith('#') ? hexToRgba(color, opacity) : color;
    return { boxShadow: `${offsetX}px ${offsetY}px ${blur}px ${rgba}` };
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
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
