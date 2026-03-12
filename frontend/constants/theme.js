// PayCircle Design Tokens — Mint Terminal Edition

// Font families — Roboto loaded globally so iOS matches Android
export const FONTS = {
  regular: 'Roboto_400Regular',
  medium:  'Roboto_500Medium',
  bold:    'Roboto_700Bold',
};

export const PC = {
  // Backgrounds — deep near-black with subtle teal warmth
  bg:             '#060A09',
  bgCard:         '#0C1210',
  bgCardElevated: '#131A17',
  bgInput:        '#0C1210',

  // Borders — teal-tinted dark
  border:      '#1C2822',
  borderLight: '#243328',

  // Text
  textPrimary:   '#EFF9F6',   // Off-white with green tint
  textSecondary: '#637870',   // Muted teal-gray
  textMuted:     '#4A6058',   // ~3.2:1 on bg — visible for secondary/hint text

  // Accent — Electric Mint
  accent:   '#00E5BE',
  accent10: 'rgba(0,229,190,0.10)',
  accent20: 'rgba(0,229,190,0.20)',

  // Status
  positive: '#00E5BE',  // Mint — income, credit, owed-to-you
  negative: '#FF5055',  // Vibrant red
  warning:  '#FFB020',  // Amber

  // Transparent utilities
  white10: 'rgba(239,249,246,0.10)',
  white20: 'rgba(239,249,246,0.20)',
  white05: 'rgba(239,249,246,0.05)',
};
