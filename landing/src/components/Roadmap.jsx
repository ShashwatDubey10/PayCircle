import { motion } from 'framer-motion';
import { useReveal } from '../hooks/useReveal';

const phases = [
  {
    phase: 'Phase 1',
    title: 'Core MVP',
    status: 'In Progress',
    statusColor: '#10d98a',
    items: [
      'JWT Auth & User Profiles',
      'Group Creation & Management',
      'Expense Splitting (Equal + Exact)',
      'Real-time Balance Engine',
      'Settlement Recording',
      'Personal Income/Expense Tracking',
      'Unified Dashboard',
      'Monthly Budget Tracking',
    ],
  },
  {
    phase: 'Phase 2',
    title: 'Enhanced UX',
    status: 'Planned',
    statusColor: '#a78bfa',
    items: [
      'Push Notifications for expenses',
      'Payment reminders & nudges',
      'Recurring expenses support',
      'Expense photos & receipts',
      'Export to CSV / PDF',
      'Dark / Light theme toggle',
      'Multi-currency support',
    ],
  },
  {
    phase: 'Phase 3',
    title: 'Smart Features',
    status: 'Future',
    statusColor: '#8888aa',
    items: [
      'AI-powered spending insights',
      'Smart budget recommendations',
      'UPI deep-link integration',
      'Recurring subscription tracker',
      'Savings goals & milestones',
      'Group analytics & reports',
      'Family account support',
    ],
  },
];

export default function Roadmap() {
  const [ref, visible] = useReveal();
  return (
    <section id="roadmap" className="section" ref={ref}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="section-tag" style={{ margin: '0 auto 18px' }}>Roadmap</motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55, delay: 0.08 }} className="section-title">
            Built to grow<br /><span className="grad-text">with you.</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={visible ? { opacity: 1 } : {}} transition={{ duration: 0.5, delay: 0.13 }} className="section-sub" style={{ margin: '0 auto' }}>
            PayCircle ships with a solid MVP, then keeps evolving. Here's what's coming next.
          </motion.p>
        </div>

        {/* Phase cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {phases.map((p, i) => (
            <motion.div
              key={p.phase}
              initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{ padding: '28px 26px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22, position: 'relative', overflow: 'hidden' }}
            >
              {/* Top accent line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${p.statusColor}, transparent)` }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>{p.phase}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', background: `${p.statusColor}18`, color: p.statusColor, borderRadius: 100 }}>{p.status}</span>
              </div>

              <div style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 20 }}>{p.title}</div>

              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {p.items.map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: '.83rem', color: 'var(--text2)', lineHeight: 1.5 }}>
                    <span style={{ color: p.statusColor, marginTop: 1, flexShrink: 0 }}>◎</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
