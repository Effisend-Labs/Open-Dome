import React, { useEffect, useState } from 'react';
import { OpenDomeLockScreen } from './LockScreen';

export function isOpenDomeHosted() {
  if (typeof window === 'undefined') return false;
  try {
    return window.parent !== window;
  } catch {
    return false;
  }
}

/**
 * Blocks rendering unless the mini-app is embedded in the OpenDome host iframe.
 * Use in venue / non-SDK roots that do not call useOpenDome at the top level.
 */
export function OpenDomeHostGate({ children, title, message }) {
  const [hosted, setHosted] = useState(null);

  useEffect(() => {
    setHosted(isOpenDomeHosted());
  }, []);

  if (hosted === null) return null;
  if (!hosted) {
    return <OpenDomeLockScreen title={title} message={message} />;
  }
  return children;
}
