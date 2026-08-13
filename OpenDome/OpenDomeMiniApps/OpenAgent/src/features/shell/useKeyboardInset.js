import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

const SNAP = 8;
const EPS = 80;

function inIframe() {
  try {
    return typeof window !== 'undefined' && window.parent !== window;
  } catch {
    return true;
  }
}

function readInset() {
  if (typeof window === 'undefined') return 0;
  const vv = window.visualViewport;
  const vvInset = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
  if (vvInset >= EPS) return vvInset;
  if (inIframe()) return vvInset;
  const vkH = window.navigator?.virtualKeyboard?.boundingRect?.height || 0;
  return Math.max(vvInset, vkH);
}

export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const apply = (next) => {
      const value = Math.max(0, Math.round(next || 0));
      setInset((prev) => (Math.abs(prev - value) < SNAP ? prev : value));
    };

    if (Platform.OS !== 'web') {
      const show = Keyboard.addListener('keyboardDidShow', (e) => {
        apply(e.endCoordinates?.height || 0);
      });
      const hide = Keyboard.addListener('keyboardDidHide', () => apply(0));
      return () => {
        show.remove();
        hide.remove();
      };
    }

    const onChange = () => apply(readInset());
    const vk = window.navigator?.virtualKeyboard;
    if (vk) {
      try {
        vk.overlaysContent = true;
      } catch {
        // read-only in some embeds
      }
      vk.addEventListener('geometrychange', onChange);
    }
    const vv = window.visualViewport;
    vv?.addEventListener('resize', onChange);
    vv?.addEventListener('scroll', onChange);
    window.addEventListener('focusin', onChange);
    window.addEventListener('focusout', onChange);
    onChange();
    const later = setTimeout(onChange, 280);
    return () => {
      vk?.removeEventListener('geometrychange', onChange);
      vv?.removeEventListener('resize', onChange);
      vv?.removeEventListener('scroll', onChange);
      window.removeEventListener('focusin', onChange);
      window.removeEventListener('focusout', onChange);
      clearTimeout(later);
    };
  }, []);

  return inset;
}
