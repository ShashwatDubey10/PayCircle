import { motion } from 'framer-motion';
import { useReveal } from '../hooks/useReveal';

const before = [
  { from: 'Aryan',  to: 'Ishashwat', amt: '₹200' },
  { from: 'Aryan',  to: 'Simran',    amt: '₹400' },
  { from: 'Dev',    to: 'Ishashwat', amt: '₹300' },
  { from: 'Dev',    to: 'Simran',    amt: '₹300' },
  { from: 'Simran', to: 'Ishashwat', amt: '₹100' },
];

const after = [
  { from: 'Aryan',  to: 'Ishashwat', amt: '₹600' },
  { from: 'Dev',    to: 'Simran',    amt: '₹600' },
];

function TransferCard({ transfers, label, accent }) {
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: `${accent}18`, border: `1px solid ${accent}30`,
        color: accent, borderRadius: 100, padding: '4px 12px',
        fontSize: 11, fontWeight: 700, letterSpacing: '.06em',
        marginBottom: 14,
      }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {transfers.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.35, delay: i * 0.08 }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 13px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}
          >
            <div style={{ fontSize: '.82rem' }}>
              <span style={{ color: '#ff5577', fontWeight: 700 }}>{t.from}</span>
              <span style={{ color: 'var(--text2)', margin: '0 6px', fontSize: 12 }}>→</span>
              <span style={{ color: '#10d98a', fontWeight: 700 }}>{t.to}</span>
            </div>
            <span style={{ fontSize: '.85rem', fontWeight: 800, color: 'var(--accent2)' }}>{t.amt}</span>
          </motion.div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: '.8rem', color: 'var(--text2)', textAlign: 'center' }}>
        {transfers.length} transfer{transfers.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

export default function AlgoSection() {
  const [ref, visible] = useReveal();
  return (
    <section className="section" ref={ref}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>
          {/* Text */}
          <div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="section-tag">Settlement Algorithm</motion.div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} animate={visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55, delay: 0.07 }} className="section-title">
              Fewer transfers.<br /><span className="grad-text">Same result.</span>
            </motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={visible ? { opacity: 1 } : {}} transition={{ duration: 0.5, delay: 0.13 }} className="section-sub">
              PayCircle's greedy debt-reduction engine runs in <strong style={{ color: 'var(--accent2)' }}>O(n log n)</strong> time, collapsing a web of IOUs into the minimum number of transfers needed to settle everyone.
            </motion.p>

            <ul className="feat-list">
              {[
                { icon: '🔢', title: 'Net Balance Calculation', desc: "Each member's total credits minus debits gives one clean number." },
                { icon: '📐', title: 'Greedy Matching', desc: 'Sort creditors and debtors, then pair them from opposite ends for maximum offset.' },
                { icon: '⏱️', title: 'O(n log n) Time', desc: 'Efficient sorting algorithm handles even large groups with blazing speed.' },
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

          {/* Before / after */}
          <motion.div
            initial={{ opacity: 0, x: 40 }} animate={visible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.15 }}
            style={{ background: '#0c0c1c', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 22, padding: '26px 24px' }}
          >
            <div style={{ display: 'flex', gap: 24 }}>
              <TransferCard transfers={before} label="Without PayCircle" accent="#ff5577" />
              <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />
              <TransferCard transfers={after}  label="With PayCircle"    accent="#10d98a" />
            </div>

            {/* Savings badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.5 }}
              style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(16,217,138,0.07)', border: '1px solid rgba(16,217,138,0.2)', borderRadius: 14, textAlign: 'center' }}
            >
              <span style={{ fontSize: '.85rem', fontWeight: 800, color: '#10d98a' }}>60% fewer transfers</span>
              <span style={{ fontSize: '.8rem', color: 'var(--text2)', marginLeft: 8 }}>— same money settled</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
