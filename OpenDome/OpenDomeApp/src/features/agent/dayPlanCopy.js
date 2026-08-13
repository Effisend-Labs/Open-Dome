/**
 * Day-plan chrome should describe the day, not repeat the anchor event title
 * (that already appears as the last timeline stop).
 */
export function getDayPlanHeadline(proposal) {
  const raw = String(proposal?.title || '').trim();
  if (raw && /^your day at /i.test(raw)) return raw;
  return 'Your day at Tokyo Dome City';
}

export function withUsdc(label) {
  const s = String(label || '').trim();
  if (!s) return '';
  return /\bUSDC\b/i.test(s) ? s : `${s} USDC`;
}

export function councilIntroLine() {
  return "Four Gemini planners will draft the day around that show. I'll pick a winner — you can still change it before we book.";
}

export function bookingIntroLine(chosenName) {
  const who = chosenName ? `${chosenName}'s` : 'that';
  return `Booking ${who} day now — holding each stop, then minting your passes.`;
}
