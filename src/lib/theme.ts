// Shared color palettes. Both screens and components import from here.

export type AppColors = typeof LIGHT;

export const LIGHT = {
  // Backgrounds
  bg:            '#15150F',
  scrollBg:      '#CBB77C',
  safe:          '#CBB77C',
  // Cards
  blackGlass:    'rgba(14, 15, 15, 0.88)',
  cardLight:     'rgba(244, 218, 156, 0.74)',
  cardDark:      'rgba(14, 15, 15, 0.88)',
  creamSoft:     'rgba(246, 220, 156, 0.78)',
  cardBrown:     'rgba(75, 48, 25, 0.58)',
  // Borders
  borderGold:    'rgba(255, 213, 121, 0.13)',
  borderGoldBright: 'rgba(247, 198, 83, 0.55)',
  // Text
  textLight:     '#F7E8C0',
  textDark:      '#2C251C',
  mutedLight:    '#CFC4AE',
  mutedDark:     '#6B5B44',
  // Accents
  gold:          '#F7C653',
  goldSoft:      'rgba(247, 198, 83, 0.18)',
  olive:         '#9BC76D',
  oliveDark:     '#6E9357',
  oliveDim:      'rgba(118, 147, 70, 0.30)',
  orange:        '#FF8B2A',
  red:           '#C0392B',
  // Hero gradients (sand fade)
  heroGradTop:   '#CBB77C' as string,
  heroGradBot:   '#CBB77C' as string,
  // Status bar
  statusBar:     'dark-content' as 'dark-content' | 'light-content',
  statusBarBg:   '#CBB77C',
  // Inputs
  inputBg:       'rgba(255, 255, 255, 0.06)',
  inputBorder:   'rgba(255, 213, 121, 0.28)',
  // Misc
  chipInactive:  'rgba(14, 15, 15, 0.75)',
  chipBorder:    'rgba(255, 213, 121, 0.22)',
  btnInactive:   'rgba(255, 255, 255, 0.07)',
  btnBorder:     'rgba(255, 213, 121, 0.20)',
  sand:          '#CBB77C',
  white:         '#FFFFFF',
};

// Dark = cool desert-night palette:
// Near-black warm sky / dark dune shadows / moonlight gold / parchment text
export const DARK: AppColors = {
  bg:            '#0F0C07',
  scrollBg:      '#1A1409',
  safe:          '#1A1409',
  blackGlass:    'rgba(8, 6, 2, 0.94)',
  cardLight:     'rgba(36, 27, 10, 0.96)',
  cardDark:      'rgba(8, 6, 2, 0.94)',
  creamSoft:     'rgba(36, 27, 10, 0.85)',
  cardBrown:     'rgba(50, 38, 16, 0.70)',
  borderGold:    'rgba(247, 198, 83, 0.18)',
  borderGoldBright: 'rgba(247, 198, 83, 0.45)',
  textLight:     '#EDD9A3',
  textDark:      '#EDD9A3',
  mutedLight:    '#8A7A5C',
  mutedDark:     '#8A7A5C',
  gold:          '#F7C653',
  goldSoft:      'rgba(247, 198, 83, 0.15)',
  olive:         '#9BC76D',
  oliveDark:     '#6E9357',
  oliveDim:      'rgba(118, 147, 70, 0.25)',
  orange:        '#E07820',
  red:           '#C0392B',
  heroGradTop:   '#1A1409',
  heroGradBot:   '#1A1409',
  statusBar:     'light-content',
  statusBarBg:   '#1A1409',
  inputBg:       'rgba(255, 255, 255, 0.04)',
  inputBorder:   'rgba(247, 198, 83, 0.22)',
  chipInactive:  'rgba(8, 6, 2, 0.85)',
  chipBorder:    'rgba(247, 198, 83, 0.20)',
  btnInactive:   'rgba(255, 255, 255, 0.05)',
  btnBorder:     'rgba(247, 198, 83, 0.18)',
  sand:          '#1A1409',
  white:         '#EDD9A3',
};

export function getColors(mode: 'light' | 'dark' | 'system'): AppColors {
  return mode === 'dark' ? DARK : LIGHT;
}
