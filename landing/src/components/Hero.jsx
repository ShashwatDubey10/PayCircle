import { motion } from 'framer-motion';

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: 'easeOut', delay },
});

function PhoneMockup() {
  return (
    <motion.div
      animate={{ y: [0, -14, 0], rotate: [-2, -2, -2] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width: 268, background: '#0e0e1e',
        borderRadius: 38, border: '1.5px solid rgba(255,255,255,0.12)',
        padding: 14, boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        position: 'relative', zIndex: 2,
      }}
    >
      <div style={{ width: 72, height: 7, background: '#1a1a2e', borderRadius: '0 0 8px 8px', margin: '0 auto 12px' }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '0 4px' }}>
        <div>
          <div style={{ fontSize: 9, color: '#8888aa' }}>Good evening,</div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Ishashwat ✌</div>
        </div>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#7c6cfa,#a78bfa)' }} />
      </div>

      {/* Balance card */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(124,108,250,0.2),rgba(167,139,250,0.08))',
        border: '1px solid rgba(124,108,250,0.2)', borderRadius: 18, padding: '14px 16px', marginBottom: 8,
      }}>
        <div style={{ fontSize: 9, color: '#8888aa' }}>Total Spent This Month</div>
        <div style={{ fontSize: 22, fontWeight: 900, margin: '3px 0' }}>₹8,340</div>
        <div style={{ fontSize: 9, color: '#10d98a', fontWeight: 600 }}>↓ 12% from last month</div>
      </div>

      {/* Mini cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
        {[
          { icon: '👥', label: 'Group', val: '₹5,120', color: '#eeeef5' },
          { icon: '👤', label: 'Personal', val: '₹3,220', color: '#eeeef5' },
          { icon: '📉', label: 'You Owe', val: '₹1,200', color: '#ff5577' },
          { icon: '📈', label: 'Owed to You', val: '₹2,450', color: '#10d98a' },
        ].map(c => (
          <div key={c.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '10px 11px' }}>
            <div style={{ fontSize: 14, marginBottom: 5 }}>{c.icon}</div>
            <div style={{ fontSize: 8, color: '#8888aa' }}>{c.label}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: c.color, marginTop: 2 }}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* Recent txns */}
      <div style={{ fontSize: 8, color: '#8888aa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6, padding: '0 2px' }}>Recent</div>
      {[
        { icon: '🍕', name: 'Pizza Night', cat: 'Group · Food', amt: '-₹125', col: '#8888aa' },
        { icon: '💰', name: 'Freelance', cat: 'Personal · Income', amt: '+₹5,000', col: '#10d98a' },
        { icon: '🚗', name: 'Cab Ride', cat: 'Personal · Travel', amt: '-₹340', col: '#ff5577' },
      ].map(t => (
        <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ fontSize: 13 }}>{t.icon}</div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 600 }}>{t.name}</div>
              <div style={{ fontSize: 8, color: '#8888aa' }}>{t.cat}</div>
            </div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, color: t.col }}>{t.amt}</div>
        </div>
      ))}
    </motion.div>
  );
}

export default function Hero() {
  return (
    <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '130px 0 90px' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>

          {/* Text */}
          <div>
            <motion.div {...fade(0.1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', padding: '6px 14px 6px 8px', borderRadius: 100, fontSize: 12, color: '#8888aa', marginBottom: 28 }}>
              <span style={{ background: 'linear-gradient(135deg,#7c6cfa,#a78bfa)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 100, letterSpacing: '.05em' }}>NEW</span>
              Built for Students & Young Professionals
            </motion.div>

            <motion.h1 {...fade(0.2)} style={{ fontSize: 'clamp(2.8rem,5.5vw,4.2rem)', fontWeight: 900, lineHeight: 1.07, letterSpacing: '-.04em', marginBottom: 22 }}>
              Split Smart.<br />
              <span className="grad-text">Track Everything.</span><br />
              Owe Nothing.
            </motion.h1>

            <motion.p {...fade(0.3)} style={{ fontSize: '1.08rem', lineHeight: 1.75, color: '#8888aa', marginBottom: 38, maxWidth: 450 }}>
              PayCircle combines group expense splitting, personal finance tracking, and an intelligent balance engine — all in one beautifully dark app.
            </motion.p>

            <motion.div {...fade(0.4)} style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <motion.a href="#features" className="btn-primary" whileHover={{ y: -2 }} whileTap={{ scale: .97 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                Explore Features
              </motion.a>
              <motion.a href="#how" className="btn-ghost" whileHover={{ y: -2 }} whileTap={{ scale: .97 }}>
                How it works
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </motion.a>
            </motion.div>

            {/* Stats */}
            <motion.div {...fade(0.5)} style={{ display: 'flex', gap: 36, marginTop: 52, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap' }}>
              {[['12', 'Core Features'], ['2-in-1', 'Group + Personal'], ['O(n log n)', 'Settlement Algorithm']].map(([num, lbl]) => (
                <div key={lbl}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-.03em', background: 'linear-gradient(135deg,#fff,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{num}</div>
                  <div style={{ fontSize: '.75rem', color: '#8888aa', marginTop: 3, fontWeight: 500 }}>{lbl}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Phone */}
          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}
          >
            {/* Glow */}
            <div style={{ position: 'absolute', width: 320, height: 320, background: 'radial-gradient(circle,rgba(124,108,250,0.22) 0%,transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

            {/* Floating badges */}
            <motion.div
              animate={{ y: [0, -8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'absolute', right: -50, top: 60, background: 'rgba(14,14,30,0.92)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 16, padding: '12px 16px', backdropFilter: 'blur(20px)', zIndex: 5 }}
            >
              <div style={{ fontSize: 9, color: '#8888aa', marginBottom: 4 }}>You are owed</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#10d98a' }}>+₹2,450</div>
              <div style={{ fontSize: 9, color: '#8888aa', marginTop: 2 }}>across 3 groups</div>
            </motion.div>

            <motion.div
              animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              style={{ position: 'absolute', left: -44, bottom: 90, background: 'rgba(14,14,30,0.92)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 16, padding: '12px 16px', backdropFilter: 'blur(20px)', zIndex: 5 }}
            >
              <div style={{ fontSize: 9, color: '#8888aa', marginBottom: 4 }}>Budget used</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#a78bfa' }}>68%</div>
              <div style={{ fontSize: 9, color: '#10d98a', marginTop: 2, fontWeight: 600 }}>On track ✓</div>
            </motion.div>

            <PhoneMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
