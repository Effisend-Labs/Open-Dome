export function themeToAgentTokens(theme) {
  const isDark = Boolean(theme?.isDark);
  return {
    FG: theme.text.primary,
    FG_SECONDARY: theme.text.secondary,
    BG: theme.bg.root || theme.bg.canvas,
    SURFACE: theme.bg.card,
    SURFACE_ELEVATED: theme.bg.panel || theme.bg.card,
    SURFACE_SUBTLE: theme.bg.nested || (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
    MUTED: theme.text.muted || theme.text.secondary,
    ACCENT: theme.text.accent,
    ACCENT_SOFT: isDark ? 'rgba(0,122,255,0.18)' : 'rgba(0,122,255,0.12)',
    BORDER: theme.border.default,
    SUCCESS: theme.status?.success || '#34C759',
    SUCCESS_SOFT: isDark ? 'rgba(52,199,89,0.14)' : 'rgba(52,199,89,0.12)',
    DANGER: theme.text.danger || theme.status?.danger || '#FF3B30',
    USDC: '#2775CA',
    USDC_SOFT: isDark ? 'rgba(39,117,202,0.18)' : 'rgba(39,117,202,0.12)',
    font: {
      primary: theme.typography?.fontFamily,
      mono: theme.typography?.mono || 'ui-monospace, SFMono-Regular, Menlo, monospace',
    },
  };
}
