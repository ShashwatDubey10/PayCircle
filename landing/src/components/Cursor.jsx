import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function Cursor() {
  const mx = useMotionValue(-100);
  const my = useMotionValue(-100);

  const sx = useSpring(mx, { stiffness: 900, damping: 35, mass: 0.5 });
  const sy = useSpring(my, { stiffness: 900, damping: 35, mass: 0.5 });
  const rx = useSpring(mx, { stiffness: 200, damping: 28, mass: 0.8 });
  const ry = useSpring(my, { stiffness: 200, damping: 28, mass: 0.8 });

  useEffect(() => {
    const move = (e) => { mx.set(e.clientX); my.set(e.clientY); };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [mx, my]);

  return (
    <>
      <motion.div
        className="cursor-dot"
        style={{ x: sx, y: sy, translateX: '-50%', translateY: '-50%' }}
      />
      <motion.div
        className="cursor-ring"
        style={{ x: rx, y: ry, translateX: '-50%', translateY: '-50%' }}
      />
    </>
  );
}
