import { motion } from 'framer-motion';
import { useReveal } from '../hooks/useReveal';

export default function CTA() {
  const [ref, visible] = useReveal();
  return (
    <section id="cta" className="section" ref={ref}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 32 }} animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65 }}
          style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg,rgba(124,108,250,0.12) 0%,rgba(167,139,250,0.06) 50%,rgba(16,217,138,0.06) 100%)',
            border: '1px solid rgba(124,108,250,0.25)',
            borderRadius: 28, padding: '72px 48px', textAlign: 'center',
          }}
        >
          {/* Background orb */}
          <div style={{ position: 'absolute', width: 500, height: 500, background: 'radial-gradient(circle,rgba(124,108,250,0.15) 0%,transparent 65%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', borderRadius: '50%' }} />

          {/* Grid overlay */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize: '40px 40px', borderRadius: 28, pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={visible ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: 0.1 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,108,250,0.15)', border: '1px solid rgba(124,108,250,0.3)', color: 'var(--accent2)', borderRadius: 100, fontSize: 11, fontWeight: 700, padding: '6px 14px', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 24 }}
            >
              <span style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              Early Access Open
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }} animate={visible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.15 }}
              style={{ fontSize: 'clamp(2rem,4.5vw,3.2rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-.04em', marginBottom: 18 }}
            >
              Ready to take control of<br />
              <span className="grad-text">your finances?</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }} animate={visible ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.22 }}
              style={{ fontSize: '1.05rem', color: 'var(--text2)', lineHeight: 1.75, maxWidth: 500, margin: '0 auto 40px' }}
            >
              Join the waitlist and be first to experience PayCircle — the smartest way to manage group and personal finances.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={visible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.28 }}
              style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}
            >
              <motion.a
                href="#"
                whileHover={{ y: -3, boxShadow: '0 0 60px rgba(124,108,250,0.5)' }}
                whileTap={{ scale: 0.97 }}
                className="btn-primary"
                style={{ fontSize: '1rem', padding: '15px 34px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 12 19.79 19.79 0 01.22 3.38 2 2 0 012.2 1.21h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.42a16 16 0 006.29 6.29l1.28-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                Join the Waitlist
              </motion.a>
              <motion.a
                href="#features"
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                className="btn-ghost"
                style={{ fontSize: '1rem', padding: '15px 34px' }}
              >
                Explore Features
              </motion.a>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }} animate={visible ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.38 }}
              style={{ display: 'flex', justifyContent: 'center', gap: 36, marginTop: 48, flexWrap: 'wrap' }}
            >
              {[['🎓', 'Built for Students'], ['🔐', 'Secure by Default'], ['⚡', 'Instant Balances']].map(([icon, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', color: 'var(--text2)', fontWeight: 500 }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  {label}
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </section>
  );
}
