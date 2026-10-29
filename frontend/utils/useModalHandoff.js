import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Opens one modal only once another has finished closing.
 *
 * On Android every `<Modal>` is its own window. Closing one and opening the
 * next in the same tick races the window manager, and the second window
 * frequently never appears — the user taps "New Group", the sheet they were
 * looking at slides away, and nothing replaces it. Nothing throws, so the tap
 * simply looks ignored.
 *
 * There is no cross-platform "did dismiss" to hang this on — `Modal`'s
 * `onDismiss` is iOS-only — so waiting out the dismiss animation is the
 * available answer. That makes this a delay rather than a signal, which is
 * exactly why it lives in one place instead of being written out at each site.
 *
 *   const handoff = useModalHandoff();
 *   onPress={() => { setSheetOpen(false); handoff(() => setNextOpen(true)); }}
 */
const DISMISS_MS = 280;   // the default slide-down, with a little room

export default function useModalHandoff(delay = DISMISS_MS) {
  const [pending, setPending] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    if (!pending) return undefined;
    timer.current = setTimeout(() => { setPending(null); pending(); }, delay);
    return () => clearTimeout(timer.current);
  }, [pending, delay]);

  // Unmounting mid-handoff must not fire into a screen that has gone.
  useEffect(() => () => clearTimeout(timer.current), []);

  // Stored as a thunk: useState treats a bare function as a lazy initialiser.
  return useCallback((open) => setPending(() => open), []);
}
