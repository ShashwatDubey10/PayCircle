import React from 'react';
import { Pressable, Platform } from 'react-native';
import { PC } from '@/constants/theme';

/**
 * The app's single press surface.
 *
 * Material's touch response is a ripple spreading from the point of contact.
 * An opacity fade is the iOS idiom, and it is the clearest tell that an app was
 * built for iPhone and shipped to Android — so every interactive control in
 * PayCircle presses through this component rather than TouchableOpacity.
 *
 * Everything about how a press feels lives here on purpose. Ripple colour,
 * boundedness and the iOS fallback are one edit in one file, not a decision
 * repeated across ~160 call sites, so the feel can be tuned on a real device
 * without touching a single screen.
 *
 * Props beyond Pressable's own:
 *
 *   tone        'neutral' (default — rows, cards, chips, inputs, icon buttons)
 *               'accent'  mint-filled controls. Takes the ground-colour ripple,
 *                         because the Dark-On-Mint rule puts dark on mint and a
 *                         light ripple on mint reads as a glow.
 *               'danger'  destructive controls in the negative wash.
 *
 *   borderless  Let the ripple spread past the control's bounds and skip the
 *               overflow clip. Required for anything carrying a shadow: the
 *               clip that contains a bounded ripple also flattens elevation,
 *               so the two FABs would lose their lift. Also the Material
 *               choice for a bare icon button that has no visible box.
 */

const RIPPLE = {
  // Derived from the palette rather than guessed: white10 is the existing
  // translucent utility, and the mint ripple reuses the exact ground-on-mint
  // value the primary CTA already uses for its trailing arrow well.
  neutral: PC.white10,
  accent:  'rgba(6,10,9,0.18)',
  danger:  'rgba(255,80,85,0.22)',
};

export default function Touchable({
  tone = 'neutral',
  borderless = false,
  style,
  children,
  ...rest
}) {
  return (
    <Pressable
      android_ripple={{ color: RIPPLE[tone] ?? RIPPLE.neutral, borderless }}
      style={state => [
        // Pressable allows style to be a function; forward that through so a
        // call site can still react to `pressed` itself.
        typeof style === 'function' ? style(state) : style,

        // `overflow: 'hidden'` clips the ripple to whatever borderRadius the
        // call site's own style sets, so no radius has to be passed in. It is
        // skipped when borderless, where clipping is exactly what we don't want.
        !borderless && { overflow: 'hidden' },

        // Android gets the ripple; iOS would otherwise have no press feedback
        // at all, since android_ripple is ignored there. 0.8 is the value
        // DESIGN.md records as the system press opacity.
        state.pressed && Platform.OS === 'ios' && { opacity: 0.8 },
      ]}
      {...rest}>
      {children}
    </Pressable>
  );
}
