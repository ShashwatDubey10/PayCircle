import { motion } from 'framer-motion';
import { useReveal } from '../hooks/useReveal';

const txns = [
  { icon: '💼', name: 'Freelance Project', cat: 'Freelance', amt: '+₹8,000', col: '#10d98a', type: 'income' },
  { icon: '🛒', name: 'Grocery Run',        cat: 'Shopping',  amt: '-₹480',  col: '#ff5577', type: 'expense' },
  { icon: '⚡', name: 'Electricity Bill',   cat: 'Utilities', amt: '-₹620',  col: '#ff5577', type: 'expense' },
  { icon: '💊', name: 'Pharmacy',           cat: 'Health',    amt: '-₹150',  col: '#ff5577', type: 'expense' },
  { icon: '💰', name: 'Monthly Salary',     cat: 'Salary',    amt: '+₹25,000', col: '#10d98a', type: 'income' },
];

const cats = [
  { name: 'Shopping',  pct: 28, color: '#a78bfa' },
  { name: 'Utilities', pct: 22, color: '#7c6cfa' },
  { name: 'Food',      pct: 19, color: '#10d98a' },
  { name: 'Health',    pct: 12, color: '#fbbf24' },
  { name: 'Travel',    pct: 9,  color: '#ff5577' },
];

function PersonalMock() {
  return (
    <div className="mock-card" style={{ maxWidth: 370 }}>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        <div style={{ padding: '14px 16px', background: 'rgba(16,217,138,0.07)', border: '1px solid rgba(16,217,138,0.15)', borderRadius: 14 }}>
          <div style={{ fontSize: 9, color: 'var(--text2)', marginBottom: 4 }}>This Month Income</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#10d98a' }}>+₹33,000</div>
        </div>
        <div style={{ padding: '14px 16px', background: 'rgba(255,85,119,0.07)', border: '1px solid rgba(255,85,119,0.15)', borderRadius: 14 }}>
          <div style={{ fontSize: 9, color: 'var(--text2)', marginBottom: 4 }}>This Month Spent</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ff5577' }}>-₹8,340</div>
        </div>
      </div>

      {/* Category bars */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 9, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>Top Categories</div>
        {cats.map(c => (
          <div key={c.name} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text2)', marginBottom: 4 }}>
              <span>{c.name}</span><span style={{ fontWeight: 700, color: c.color }}>{c.pct}%</span>
            </div>
            <div className="bar-bg">
              <motion.div
                className="bar"
                style={{ background: c.color, width: `${c.pct}%` }}
                initial={{ width: 0 }}
                whileInView={{ width: `${c.pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Transaction list */}
      <div style={{ fontSize: 9, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>Transactions</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {txns.map(t => (
          <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              <div>
                <div style={{ fontSize: '.8rem', fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: '.7rem', color: 'var(--text2)' }}>{t.cat}</div>
              </div>
            </div>
            <span style={{ fontSize: '.82rem', fontWeight: 800, color: t.col }}>{t.amt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PersonalSection() {
  const [ref, visible] = useReveal();
  return (
    <section id="personal" className="section" ref={ref}>
      <div className="container">
        <div className="two-col reverse">
          {/* Mock */}
          <motion.div
            initial={{ opacity: 0, x: -40 }} animate={visible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.15 }}
            style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}
          >
            <div style={{ position: 'absolute', width: 280, height: 280, background: 'radial-gradient(circle,rgba(16,217,138,0.13) 0%,transparent 70%)', borderRadius: '50%', pointerEvents: 'none', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
            <PersonalMock />
          </motion.div>

          {/* Text */}
          <div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="section-tag">Personal Finance</motion.div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} animate={visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55, delay: 0.07 }} className="section-title">
              Your money,<br /><span className="grad-text">fully visible.</span>
            </motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={visible ? { opacity: 1 } : {}} transition={{ duration: 0.5, delay: 0.13 }} className="section-sub">
              Track every rupee — salary, freelance gigs, groceries, subscriptions. 10 categories keep your financial picture crystal-clear.
            </motion.p>

            <ul className="feat-list">
              {[
                { icon: '📥', title: '10 Smart Categories', desc: 'Food, Travel, Utilities, Health, Shopping, Salary, Freelance, Investment, Entertainment, Misc.' },
                { icon: '📈', title: 'Income & Expense Views', desc: 'Filter by type, category, or date range for instant spending insights.' },
                { icon: '🧩', title: 'Unified with Groups', desc: 'Personal and group spending merge on your dashboard for one complete financial picture.' },
              ].map(f => (
                <li key={f.title} className="feat-list-item">
                  <div className="fli-icon">{f.icon}</div>
                  <div>
                    <div className="fli-title">{f.title}</div>
                    <div className="fli-desc">{f.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
