/**
 * OpenDomeApp — Design Tokens
 *
 * Single source of truth for colors, spacing, typography, radii, shadows.
 * Components MUST consume from here — no hardcoded hex/sizes in component files.
 *
 * Brand: "OpenDome macOS" — deep black canvas, iOS-blue accent, semantic
 * status colors. (The legacy "Luxury Dark" gold palette in `core/styles.js`
 * is intentionally NOT represented here; that file will be deprecated.)
 */

// ─── Color tokens (raw palette) ────────────────────────────────────────────
const palette = {
  // Neutrals — pushed deeper for the "obsidian" feel
  void:         "#000000",
  obsidian:     "#050507",
  ink:          "#08080A",
  carbon:       "#0A0A0C", // canvas
  basalt:       "#0E0E12", // menubar
  slate:        "#13131A", // elevated surface (card)
  graphite:     "#1A1A22", // nested surface (modal)
  iron:         "#23232C", // border
  smoke:        "#34343F", // subtle border
  ash:          "#5A5A66", // disabled
  fog:          "#8E8E93", // muted text
  mist:         "#A8A8B0", // secondary text
  cloud:        "#D6D6DC", // body text
  paper:        "#FFFFFF", // primary text
  // Brand — Tokyo venue fiber-optic
  brand:        "#3B82F6", // iOS system blue
  brandDim:     "#0A84FF", // alt brand
  brandSoft:    "rgba(59, 130, 246, 0.10)",
  brandGlow:    "rgba(59, 130, 246, 0.35)",
  // Accent spectrum — the "neon fiber" palette
  cyan:         "#00E0FF",
  cyanGlow:     "rgba(0, 224, 255, 0.45)",
  magenta:      "#FF2E92",
  magentaGlow:  "rgba(255, 46, 146, 0.45)",
  gold:         "#FFB020",
  goldGlow:     "rgba(255, 176, 32, 0.40)",
  emerald:      "#10E89C",
  emeraldGlow:  "rgba(16, 232, 156, 0.45)",
  // Status
  success:      "#10E89C", // emerald
  warning:      "#FFB020", // gold
  danger:       "#FF453A", // iOS red
  // Traffic lights
  close:        "#FF5F57",
  minimize:     "#FFBD2E",
  maximize:     "#28C940",
};

// ─── Semantic color tokens (consume these, not raw palette) ────────────────
export const colors = {
  // Surfaces
  bg: {
    canvas:    palette.carbon,
    menubar:   palette.basalt,
    card:      palette.slate,
    cardGlass: "rgba(19, 19, 26, 0.65)", // translucent glass for layered cards
    modal:     palette.graphite,
    nested:    palette.basalt,
    overlay:   "rgba(0, 0, 0, 0.78)",
    frosted:   "rgba(20, 20, 28, 0.55)", // for the biometric pill / chip
  },
  // Text
  text: {
    primary:   palette.paper,
    body:      palette.cloud,
    secondary: palette.mist,
    muted:     palette.fog,
    disabled:  palette.ash,
    onAccent:  palette.ink,
    inverse:   palette.obsidian,
  },
  // Borders
  border: {
    subtle:    "rgba(255, 255, 255, 0.05)",
    default:   palette.iron,
    strong:    palette.smoke,
    accent:    palette.brand,
    glass:     "rgba(255, 255, 255, 0.10)", // the 1px inner border on glass cards
  },
  // Brand & state
  brand: {
    primary:   palette.brand,
    alt:       palette.brandDim,
    soft:      palette.brandSoft,
    glow:      palette.brandGlow,
  },
  neon: {
    cyan:      palette.cyan,
    cyanGlow:  palette.cyanGlow,
    magenta:   palette.magenta,
    magentaGlow: palette.magentaGlow,
    gold:      palette.gold,
    goldGlow:  palette.goldGlow,
    emerald:   palette.emerald,
    emeraldGlow: palette.emeraldGlow,
  },
  status: {
    success:   palette.success,
    danger:    palette.danger,
    warning:   palette.warning,
    info:      palette.brand,
  },
  traffic: {
    close:     palette.close,
    minimize:  palette.minimize,
    maximize:  palette.maximize,
  },
};

// ─── Per-app accent palette — neon spectrum ────────────────────────────────
export const appAccents = {
  primary:  palette.brand,
  cyan:     palette.cyan,
  magenta:  palette.magenta,
  gold:     palette.gold,
  emerald:  palette.emerald,
  neutral:  palette.fog,
};

// ─── Spacing scale (4-pt grid) ─────────────────────────────────────────────
export const space = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 64,
};

// ─── Border radii ──────────────────────────────────────────────────────────
export const radii = {
  none: 0,
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  xxl:  20,
  pill: 999,
  frame: 38,
};

// ─── Typography (in normalized px; consumers must call `normalize(size)`) ──
export const type = {
  caption:   9,
  micro:    10,
  small:    11,
  body:     13,
  base:     14,
  lead:     16,
  h3:       18,
  h2:       22,
  h1:       28,
  display:  36,
  hero:     44,  // "TOKYO" sized
  monolith: 56,  // "DOME CITY" sized
};

// ─── Elevation (RN shadow* props) ──────────────────────────────────────────
export const shadow = {
  none: { shadowOpacity: 0, elevation: 0 },
  sm:   { shadowColor: "#000", shadowOffset: { width: 0, height: 2 },  shadowOpacity: 0.30, shadowRadius: 6,  elevation: 2 },
  md:   { shadowColor: "#000", shadowOffset: { width: 0, height: 8 },  shadowOpacity: 0.40, shadowRadius: 16, elevation: 6 },
  lg:   { shadowColor: "#000", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.60, shadowRadius: 40, elevation: 12 },
};

// ─── Linear gradient stops (consumed by RN-style backgrounds) ─────────────
// RN doesn't support linear-gradient natively; these are intended to be
// composed as solid + overlay Views or used as text color values for
// gradient text effects via maskImage / absolute overlays.
export const gradientStops = {
  cyanToMagenta:    [palette.cyan,    palette.magenta],
  cyanToBrand:      [palette.cyan,    palette.brand],
  brandToMagenta:   [palette.brand,   palette.magenta],
  goldToMagenta:    [palette.gold,    palette.magenta],
  emeraldToCyan:    [palette.emerald, palette.cyan],
  // Light-leak gradient: a top-down white-to-transparent highlight that
  // gives glass surfaces a "rim lit by ambient" feel.
  rimLight:         ["rgba(255, 255, 255, 0.18)", "rgba(255, 255, 255, 0)"],
};

// ─── Springboard — currently ONLY the TDC Events mini app ──────────────────
export const springboardApps = [
  {
    id:         "tdc",
    name:       "TDC EVENTS",
    subtitle:   "Tokyo Dome City schedule",
    meta:       "12 EVENTS · 4 VENUES",
    accent:     appAccents.cyan,
    accentGlow: colors.neon.cyanGlow,
    symbol:     "TDC",          // monogram inside the custom dome icon
    happening:  3,              // count for the "HAPPENING NOW" pulse
    url:        "https://miniapp.expo.app/",
  },
];
