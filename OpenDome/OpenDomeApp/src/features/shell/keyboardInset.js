const EPS = 80;

function inIframe() {
  try {
    return typeof window !== 'undefined' && window.parent !== window;
  } catch {
    return true;
  }
}

/**
 * Keyboard overlap in CSS pixels.
 * Prefer visualViewport when the browser actually resized/panned.
 * On Android Chrome with overlays-content, only VirtualKeyboard reports height.
 * Skip VirtualKeyboard inside iframes so the host can inset without double-padding.
 */
export function readKeyboardInset(layoutHeight) {
  if (typeof window === 'undefined') return 0;

  const base = layoutHeight || window.innerHeight;
  const vv = window.visualViewport;
  const vvInset = vv ? Math.max(0, base - vv.height - vv.offsetTop) : 0;
  if (vvInset >= EPS) return vvInset;
  if (inIframe()) return vvInset;

  const vkH = window.navigator?.virtualKeyboard?.boundingRect?.height || 0;
  return Math.max(vvInset, vkH);
}

export function visibleViewportBottom(layoutHeight) {
  if (typeof window === 'undefined') return 0;
  const inset = readKeyboardInset(layoutHeight);
  if (inset > 0) return (layoutHeight || window.innerHeight) - inset;
  const vv = window.visualViewport;
  if (vv) return vv.offsetTop + vv.height;
  return window.innerHeight;
}

function pinDocument() {
  if (typeof window === 'undefined') return;
  if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
}

function enableKeyboardGeometry() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null;
  const vk = navigator.virtualKeyboard;
  if (vk) {
    try {
      vk.overlaysContent = true;
    } catch {
      // Ignore — some embeds expose the object as read-only.
    }
    return vk;
  }

  const meta = document.querySelector('meta[name="viewport"]');
  if (meta?.content?.includes('overlays-content')) {
    meta.content = meta.content.replace(
      'interactive-widget=overlays-content',
      'interactive-widget=resizes-visual',
    );
  }
  return null;
}

export function bindKeyboardInset(onChange) {
  if (typeof window === 'undefined') return () => {};

  const vk = enableKeyboardGeometry();
  const vv = window.visualViewport;
  const handle = () => {
    pinDocument();
    onChange();
  };

  vk?.addEventListener('geometrychange', handle);
  vv?.addEventListener('resize', handle);
  vv?.addEventListener('scroll', handle);
  window.addEventListener('resize', handle);
  window.addEventListener('focusin', handle);
  window.addEventListener('focusout', handle);
  window.addEventListener('scroll', pinDocument, { passive: true });

  handle();
  const later = window.setTimeout(handle, 280);

  return () => {
    vk?.removeEventListener('geometrychange', handle);
    vv?.removeEventListener('resize', handle);
    vv?.removeEventListener('scroll', handle);
    window.removeEventListener('resize', handle);
    window.removeEventListener('focusin', handle);
    window.removeEventListener('focusout', handle);
    window.removeEventListener('scroll', pinDocument);
    window.clearTimeout(later);
  };
}
