import { Platform, TextStyle, ViewStyle } from 'react-native';

/// Design tokens.
///
/// Warm, botanical, calm: greens and creams, generous whitespace, rounded but not
/// childish. Every colour pair used for text was checked against WCAG AA (4.5:1) - the
/// figures are in the comments so nobody has to trust the names.

// --- colour ---------------------------------------------------------------

export const color = {
  canvas: '#F5F9F3',          // screen background
  surface: '#FFFFFF',         // cards, sheets, tab bar
  surfaceSunken: '#EFF4EC',   // inputs, quiet buttons, tiles
  surfacePressed: '#E3EBE0',  // quiet things while pressed
  line: '#D6E3D3',            // hairlines and card borders

  text: '#2E3A30',            // 11.9:1 on surface
  textSecondary: '#5B685A',   // 5.9:1 on surface, 5.5:1 on canvas
  textTertiary: '#77826F',    // 4.0:1 - placeholders and decorative marks only
  textOnBrand: '#FFFFFF',
  textDisabled: '#9AA396',

  brand: '#3F7A49',           // buttons, active tab, progress - 5.1:1 under white
  brandDeep: '#3A6B41',       // pressed, and text on brand tints - 6.3:1 on surface
  brandTint: '#E4F0E2',       // selected rows, level-up banner
  brandPale: '#CFE3CD',       // progress tracks, focus rings

  sun: '#E9C44C',             // icons and illustration only, never text
  sunTint: '#FBF1CF',
  sunText: '#7A5E0B',         // 5.4:1 on sunTint

  soilTint: '#F1EBE3',
  soilText: '#6E5B4A',        // 5.4:1 on soilTint

  water: '#4FA8E8',           // the drop
  waterTint: '#E3F0FA',
  waterText: '#1F6FA8',       // 4.7:1 on waterTint

  dangerTint: '#FBE9DE',
  dangerText: '#A44F1F',      // 4.8:1 on dangerTint, 5.7:1 on surface

  sky: '#DCEAF2',
  grass: '#74C05A',
} as const;

// --- type -----------------------------------------------------------------

/// Six sizes. Numbers that line up in columns should add `tabular`.
export const type = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: color.text } as TextStyle,
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: color.text } as TextStyle,
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: color.text } as TextStyle,
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400', color: color.text } as TextStyle,
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: color.text } as TextStyle,
  bodyMuted: { fontSize: 15, lineHeight: 22, fontWeight: '400', color: color.textSecondary } as TextStyle,
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400', color: color.textSecondary } as TextStyle,
  captionStrong: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: color.text } as TextStyle,
  label: {
    fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 0.4,
    textTransform: 'uppercase', color: color.textSecondary,
  } as TextStyle,
} as const;

export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

// --- space, radius, size --------------------------------------------------

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const radius = { xs: 8, sm: 12, md: 16, lg: 20, pill: 999 } as const;

export const size = {
  tap: 44,                // minimum hit size
  button: 48,
  chip: 40,
  gutter: space.lg,       // screen edge
  cardGap: space.md,
  sectionGap: space.xxl,
  contentMaxWidth: 640,   // card stacks on tablet and web
} as const;

// --- shadow ---------------------------------------------------------------

const shadowFor = (opacity: number, radiusPx: number, height: number): ViewStyle =>
  Platform.select({
    web: { boxShadow: `0 ${height}px ${radiusPx}px rgba(58,107,65,${opacity})` } as ViewStyle,
    default: {
      shadowColor: color.brandDeep,
      shadowOpacity: opacity,
      shadowRadius: radiusPx,
      shadowOffset: { width: 0, height },
      elevation: Math.round(height),
    },
  }) as ViewStyle;

export const shadow = {
  card: shadowFor(0.06, 8, 2),
  raised: shadowFor(0.14, 16, 6),
} as const;

// --- motion ---------------------------------------------------------------

export const motion = {
  press: 100,      // a button acknowledging a finger
  quick: 180,      // chips, toggles, fades
  standard: 240,   // tab cross-fade, rows expanding
} as const;

// --- illustration palette -------------------------------------------------

/// Colours the artwork is drawn in: sprites, the plot, the house. These are not UI
/// tokens and are not subject to the text contrast rules above - a leaf does not have
/// to be readable. Kept under the old name so the drawings stay pixel-identical.
export const Theme = {
  background: color.canvas,
  surface: color.surface,
  surfaceAlt: color.surfaceSunken,

  leaf: '#4E8B57',
  leafDeep: '#3A6B41',
  leafLight: '#7FB37F',
  leafPale: '#CFE3CD',

  sun: '#E9C44C',
  sunPale: '#F7E9BC',

  soil: '#8A7561',
  soilDeep: '#6E5B4A',
  soilPale: '#C8B8A5',

  ink: color.text,
  inkSoft: color.textSecondary,
  warmGrey: '#EDE7DE',

  sky: color.sky,
  alert: color.dangerText,

  cardRadius: radius.md,
} as const;
