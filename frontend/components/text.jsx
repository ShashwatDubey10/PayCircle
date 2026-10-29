import React from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';

/**
 * Text and TextInput with the OS font-scale capped.
 *
 * Android lets anyone enlarge every label system-wide, and this layout is
 * deliberately dense — DESIGN.md records 11–15px type for nearly everything
 * that isn't a figure, on tight rows with fixed heights. Past roughly 1.2x the
 * text outgrows its containers and clips: headings lose their descenders,
 * titles truncate mid-word, stat labels disappear.
 *
 * Capping the multiplier leaves someone who enlarged their text with a screen
 * that is bigger and still readable, rather than one that is broken. That is
 * the better of the two failures, but it is still a failure — it gives a
 * large-text user less than they asked for.
 *
 * This is a stopgap, not the fix. The fix is letting containers grow: roughly
 * 25 text-bearing styles still carry a hardcoded `height`, the tab bar's 64px
 * is fixed, and screen titles truncate rather than wrap. As those are resolved
 * this number should rise, and ideally the cap goes away.
 *
 * Verified to apply on Android: maxFontSizeMultiplier is declared on the shared
 * TextProps (not the iOS-only set), handled by ReactBaseTextShadowNode on the
 * old architecture and by TextAttributes.cpp under Fabric, which is the path
 * this app takes.
 */

export const MAX_FONT_SCALE = 1.2;

// Props spread last so any call site can opt out or choose its own ceiling.
export function Text(props) {
  return <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} />;
}

export function TextInput(props) {
  return <RNTextInput maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} />;
}
