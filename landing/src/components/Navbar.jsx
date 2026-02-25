import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const links = [
  { label: 'Features',  href: '#features'  },
  { label: 'Groups',    href: '#groups'    },
  { label: 'Personal',  href: '#personal'  },
  { label: 'Dashboard', href: '#dashboard' },
  { label: 'Roadmap',   href: '#roadmap'   },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: scrolled ? '12px 0' : '20px 0',
        background: 'rgba(7,7,15,0.8)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        transition: 'padding .3s',
      }}
    >
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-.02em' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg,#7c6cfa,#a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#fff',
          }}>◎</div>
          PayCircle
        </a>

        {/* Links */}
        <ul style={{ display: 'flex', gap: 32, listStyle: 'none' }} className="nav-hide-mobile">
          {links.map(l => (
            <li key={l.label}>
              <a href={l.href} style={{ color: '#8888aa', fontSize: '.88rem', fontWeight: 500, transition: 'color .2s' }}
                onMouseEnter={e => e.target.style.color = '#eeeef5'}
                onMouseLeave={e => e.target.style.color = '#8888aa'}
              >{l.label}</a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <motion.a
          href="#cta"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          style={{
            background: 'linear-gradient(135deg,#7c6cfa,#a78bfa)',
            color: '#fff', padding: '9px 20px', borderRadius: 10,
            fontSize: '.88rem', fontWeight: 700,
            boxShadow: '0 0 20px rgba(124,108,250,0.3)',
          }}
        >
          Get Early Access
        </motion.a>
      </div>
    </motion.nav>
  );
}
