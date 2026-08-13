function copyWithExecCommand(text) {
  if (typeof document === 'undefined') return false;
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.setAttribute('contenteditable', 'true');
  el.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:0;padding:0;margin:0;';
  document.body.appendChild(el);
  el.focus();
  el.select();
  el.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(el);
  return ok;
}

export async function copyText(text) {
  const value = String(text || '');
  if (!value) throw new Error('Nothing to copy');

  // Sync execCommand first — keeps the click gesture in iframes where
  // navigator.clipboard.writeText is blocked or loses user activation.
  if (copyWithExecCommand(value)) return;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const Clipboard = await import('expo-clipboard');
  const ok = await Clipboard.setStringAsync(value);
  if (!ok) throw new Error('Copy failed');
}
