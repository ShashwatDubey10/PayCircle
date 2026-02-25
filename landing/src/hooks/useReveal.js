import { useRef } from 'react';
import { useInView } from 'framer-motion';

export function useReveal(options = {}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px', ...options });
  return [ref, isInView];
}
