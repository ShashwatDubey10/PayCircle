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
  textPrimary:   '#EFF9F6',   // Off-white with green tint — 16.5:1 on bgCardElevated
  textSecondary: '#92A59E',   // Muted teal-gray — 6.8:1 on bgCardElevated (AA)
  textMuted:     '#68877C',   // Dim teal-gray — 4.5:1 on bgCardElevated (AA floor)

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

// ── Accessibility ───────────────────────────────────────────────────────────
// Material's minimum touch target is 48x48dp. touchSlop() expands a control's
// touch area up to that floor without changing its visual box. Pass the
// rendered size, or (width, height) when they differ — a wide, short control
// like a chip takes touchSlop(0, 30) so only its vertical reach grows and
// neighbouring hit areas stay clear of each other.
export const TOUCH_TARGET_MIN = 48;

export const touchSlop = (width, height = width) => {
  const x = Math.max(0, Math.ceil((TOUCH_TARGET_MIN - width) / 2));
  const y = Math.max(0, Math.ceil((TOUCH_TARGET_MIN - height) / 2));
  return { left: x, right: x, top: y, bottom: y };
};
