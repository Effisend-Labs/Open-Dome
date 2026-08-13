/**
 * Day-plan chrome should describe the day, not repeat the anchor event title
 * (that already appears as the last timeline stop).
 */
export function getDayPlanHeadline(proposal) {
  const raw = String(proposal?.title || '').trim();
  if (raw && /^your day at /i.test(raw)) return raw;
  return 'Your day at Tokyo Dome City';
}
