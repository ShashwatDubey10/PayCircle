import { motion } from 'framer-motion';
import { useReveal } from '../hooks/useReveal';

const metrics = [
  { label: 'Total Spent',    value: '₹11,560', sub: 'Group + Personal', color: '#a78bfa' },
  { label: 'Total Income',   value: '₹33,000', sub: 'This month',       color: '#10d98a' },
  { label: 'You Are Owed',   value: '₹2,450',  sub: 'Across groups',    color: '#10d98a' },
  { label: 'You Owe',        value: '₹1,200',  sub: 'Net payable',      color: '#ff5577' },
];

const cats = [
  { name: 'Food',        pct: 31, color: '#a78bfa' },
  { name: 'Travel',      pct: 24, color: '#7c6cfa' },
  { name: 'Utilities',   pct: 18, color: '#10d98a' },
  { name: 'Shopping',    pct: 15, color: '#fbbf24' },
  { name: 'Others',      pct: 12, color: '#8888aa' },
];

function DashboardMock() {
  return (
    <div style={{ background: '#0c0c1c', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 24, padding: '28px 26px', width: '100%', maxWidth: 560 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)' }}>February 2026</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>Monthly Overview</div>
        </div>
        <span className="mock-chip purple">On Track ✓</span>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}
            style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }}
          >
            <div style={{ fontSize: 9, color: 'var(--text2)', marginBottom: 5 }}>{m.label}</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 9, color: 'var(--text2)', marginTop: 3 }}>{m.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Category breakdown */}
      <div style={{ padding: '18px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }}>
        <div style={{ fontSize: 9, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 14 }}>Spending Breakdown</div>
        {cats.map((c) => (
          <div key={c.name} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text2)', marginBottom: 5 }}>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.name}</span>
              <span style={{ fontWeight: 700, color: c.color }}>{c.pct}%</span>
            </div>
            <div className="bar-bg">
              <motion.div
                className="bar" style={{ background: c.color }}
                initial={{ width: 0 }} whileInView={{ width: `${c.pct}%` }}
                viewport={{ once: true }} transition={{ duration: 0.75, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Budget row */}
      <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, padding: '12px 14px', background: 'rgba(124,108,250,0.07)', border: '1px solid rgba(124,108,250,0.15)', borderRadius: 12 }}>
          <div style={{ fontSize: 9, color: 'var(--text2)', marginBottom: 4 }}>Budget</div>
          <div style={{ fontSize: '.95rem', fontWeight: 900, color: 'var(--accent2)' }}>₹15,000</div>
          <div style={{ fontSize: 9, color: 'var(--text2)', marginTop: 2 }}>Set for Feb</div>
        </div>
        <div style={{ flex: 1, padding: '12px 14px', background: 'rgba(16,217,138,0.06)', border: '1px solid rgba(16,217,138,0.12)', borderRadius: 12 }}>
          <div style={{ fontSize: 9, color: 'var(--text2)', marginBottom: 4 }}>Used</div>
          <div style={{ fontSize: '.95rem', fontWeight: 900, color: '#10d98a' }}>77%</div>
          <div style={{ fontSize: 9, color: '#10d98a', marginTop: 2 }}>Healthy ✓</div>
        </div>
        <div style={{ flex: 1, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
          <div style={{ fontSize: 9, color: 'var(--text2)', marginBottom: 4 }}>Remaining</div>
          <div style={{ fontSize: '.95rem', fontWeight: 900 }}>₹3,440</div>
          <div style={{ fontSize: 9, color: 'var(--text2)', marginTop: 2 }}>5 days left</div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardSection() {
  const [ref, visible] = useReveal();
  return (
    <section id="dashboard" className="section" ref={ref}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="section-tag" style={{ margin: '0 auto 18px' }}>Unified Dashboard</motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55, delay: 0.07 }} className="section-title">
            Your entire financial life,<br /><span className="grad-text">in one glance.</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={visible ? { opacity: 1 } : {}} transition={{ duration: 0.5, delay: 0.13 }} className="section-sub" style={{ margin: '0 auto' }}>
            Group spend, personal transactions, balance summaries, and budget health all aggregated into a single beautiful dashboard view.
          </motion.p>
        </div>

        {/* Dashboard mock - full width */}
        <motion.div
          initial={{ opacity: 0, y: 32 }} animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, delay: 0.2 }}
          style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}
        >
          <div style={{ position: 'absolute', width: 500, height: 300, background: 'radial-gradient(ellipse,rgba(124,108,250,0.12) 0%,transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
          <DashboardMock />
        </motion.div>
      </div>
    </section>
  );
}
