import { Platform } from 'react-native';

// PayCircle Design Tokens
export const PC = {
  // Backgrounds
  bg: '#0A0A0A',
  bgCard: '#141414',
  bgCardElevated: '#1E1E1E',
  bgInput: '#181818',

  // Borders
  border: '#252525',
  borderLight: '#303030',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  textMuted: '#444444',

  // Status colors
  positive: '#5CB85C',
  negative: '#E05A5A',
  warning: '#F5A623',

  // Transparent white
  white10: 'rgba(255,255,255,0.10)',
  white20: 'rgba(255,255,255,0.20)',
  white05: 'rgba(255,255,255,0.05)',
};

// Colors kept for existing component compatibility
export const Colors = {
  light: {
    text: '#FFFFFF',
    background: '#0A0A0A',
    tint: '#FFFFFF',
    icon: '#888888',
    tabIconDefault: '#555555',
    tabIconSelected: '#FFFFFF',
  },
  dark: {
    text: '#FFFFFF',
    background: '#0A0A0A',
    tint: '#FFFFFF',
    icon: '#888888',
    tabIconDefault: '#555555',
    tabIconSelected: '#FFFFFF',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
