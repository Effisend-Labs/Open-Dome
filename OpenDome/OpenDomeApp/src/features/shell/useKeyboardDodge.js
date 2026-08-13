import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

const GAP = 16;

function visibleBottom() {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  if (!vv) return 0;
  return vv.offsetTop + vv.height;
}

/**
 * Lift a focused field just enough that the keyboard does not cover it.
 * No page scrolling — translate only while the field is focused and covered.
 */
export function useKeyboardDodge() {
  const fieldRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [shift, setShift] = useState(0);
  const shiftRef = useRef(0);
  shiftRef.current = shift;

  useEffect(() => {
    if (Platform.OS !== 'web' || !focused) {
      setShift(0);
      return undefined;
    }

    const dodge = () => {
      const el = fieldRef.current;
      if (!el?.getBoundingClientRect) return;
      const rect = el.getBoundingClientRect();
      const bottom = rect.bottom + shiftRef.current;
      const need = Math.max(0, Math.ceil(bottom - visibleBottom() + GAP));
      if (Math.abs(need - shiftRef.current) > 2) setShift(need);
    };

    dodge();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', dodge);
    vv?.addEventListener('scroll', dodge);
    const later = setTimeout(dodge, 280);
    return () => {
      vv?.removeEventListener('resize', dodge);
      vv?.removeEventListener('scroll', dodge);
      clearTimeout(later);
    };
  }, [focused]);

  return {
    fieldRef,
    onFocus: (event) => {
      const node = event?.target || event?.nativeEvent?.target;
      if (node?.getBoundingClientRect) fieldRef.current = node;
      setFocused(true);
    },
    onBlur: () => setFocused(false),
    dodgeStyle:
      shift > 0
        ? {
            transform: [{ translateY: -shift }],
            ...Platform.select({
              web: { transitionDuration: '180ms', transitionProperty: 'transform' },
              default: {},
            }),
          }
        : null,
  };
}
