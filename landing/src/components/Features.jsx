import { motion } from 'framer-motion';
import { useReveal } from '../hooks/useReveal';

const features = [
  { icon: '👥', title: 'Group Expense Splitting', desc: 'Create groups for trips, roommates, or outings. Split bills equally or with custom exact amounts.' },
  { icon: '👤', title: 'Personal Finance', desc: 'Log your own income and expenses across 10 categories. Keep your personal and group finances unified.' },
  { icon: '⚡', title: 'Real-time Balance Engine', desc: 'Instant net balance calculation every time an expense or settlement is recorded. Always accurate.' },
  { icon: '📊', title: 'Unified Dashboard', desc: 'One view for your total monthly spend, group activity, personal cash flow, and budget health.' },
  { icon: '🎯', title: 'Budget Alerts', desc: 'Set a monthly budget and get smart status updates — Healthy, Warning, Critical, or Over budget.' },
  { icon: '🧠', title: 'Settlement Optimization', desc: 'Greedy debt-reduction algorithm minimizes the number of payments needed to settle a group.' },
  { icon: '🔐', title: 'Secure JWT Auth', desc: 'Industry-standard bcrypt password hashing + 7-day JWT tokens for safe, stateless authentication.' },
  { icon: '📂', title: 'Smart Categories', desc: '10 personal categories and 4 expense categories with automatic insights into spending patterns.' },
];

const card = (i) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.5, delay: i * 0.07, ease: 'easeOut' },
});

export default function Features() {
  const [ref, visible] = useReveal();
  return (
    <section id="features" className="section" ref={ref}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }} className="section-tag" style={{ margin: '0 auto 18px' }}
          >
            Everything You Need
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }} animate={visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.08 }} className="section-title"
          >
            12 Features. <span className="grad-text">One App.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }} animate={visible ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.15 }} className="section-sub"
            style={{ margin: '0 auto' }}
          >
            PayCircle packs a complete personal + group finance toolkit into a single, beautiful experience.
          </motion.p>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {features.map((f, i) => (
            <motion.div key={f.title} {...card(i)}
              whileHover={{ y: -4, borderColor: 'rgba(124,108,250,0.4)' }}
              style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 20, padding: '26px 24px',
                transition: 'border-color .25s',
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: 'rgba(124,108,250,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, marginBottom: 16,
              }}>{f.icon}</div>
              <div style={{ fontSize: '.92rem', fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: '.82rem', color: 'var(--text2)', lineHeight: 1.65 }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
