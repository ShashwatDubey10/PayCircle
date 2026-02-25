import { motion } from 'framer-motion';
import { useReveal } from '../hooks/useReveal';

const balances = [
  { name: 'Ishashwat', net: +1800, label: 'gets back', color: '#10d98a', pct: 100 },
  { name: 'Aryan',     net: -600,  label: 'owes',      color: '#ff5577', pct: 33 },
  { name: 'Simran',    net: -600,  label: 'owes',      color: '#ff5577', pct: 33 },
  { name: 'Dev',       net: -600,  label: 'owes',      color: '#ff5577', pct: 33 },
];

const debts = [
  { from: 'Aryan',  arrow: '→', to: 'Ishashwat', amt: '₹600' },
  { from: 'Simran', arrow: '→', to: 'Ishashwat', amt: '₹600' },
  { from: 'Dev',    arrow: '→', to: 'Ishashwat', amt: '₹600' },
];

function BalanceMock() {
  return (
    <div className="mock-card" style={{ maxWidth: 370 }}>
      <div style={{ fontSize: 9, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 14 }}>Net Balances · Goa Trip</div>

      {/* Balance bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
        {balances.map((b) => (
          <div key={b.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: '.84rem', fontWeight: 600 }}>{b.name}</span>
              <span style={{ fontSize: '.82rem', fontWeight: 800, color: b.color }}>
                {b.net > 0 ? `+₹${b.net}` : `-₹${Math.abs(b.net)}`}
              </span>
            </div>
            <div className="bar-bg" style={{ position: 'relative' }}>
              <motion.div
                className="bar"
                style={{ background: b.color, opacity: b.net > 0 ? 1 : 0.65 }}
                initial={{ width: 0 }}
                whileInView={{ width: `${b.pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.75, ease: 'easeOut', delay: 0.15 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 18 }} />

      {/* Debt list */}
      <div style={{ fontSize: 9, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Suggested Settlements</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {debts.map((d, i) => (
          <motion.div
            key={d.from}
            initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 11 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.83rem' }}>
              <span style={{ color: '#ff5577', fontWeight: 700 }}>{d.from}</span>
              <span style={{ color: 'var(--text2)', fontSize: 12 }}>{d.arrow}</span>
              <span style={{ color: '#10d98a', fontWeight: 700 }}>{d.to}</span>
            </div>
            <span style={{ fontSize: '.88rem', fontWeight: 900, color: 'var(--accent2)' }}>{d.amt}</span>
          </motion.div>
        ))}
      </div>

      <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(16,217,138,0.07)', borderRadius: 10, border: '1px solid rgba(16,217,138,0.15)', fontSize: 9, color: '#10d98a', fontWeight: 600, textAlign: 'center' }}>
        ✓ 3 transfers settle the entire group
      </div>
    </div>
  );
}

export default function BalanceSection() {
  const [ref, visible] = useReveal();
  return (
    <section className="section" ref={ref}>
      <div className="container">
        <div className="two-col">
          {/* Text */}
          <div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="section-tag">Balance Engine</motion.div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} animate={visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55, delay: 0.07 }} className="section-title">
              Always know<br /><span className="grad-text">who owes what.</span>
            </motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={visible ? { opacity: 1 } : {}} transition={{ duration: 0.5, delay: 0.13 }} className="section-sub">
              The real-time balance engine tracks every credit and debit, then presents a clean, simplified list of who pays whom to fully settle a group.
            </motion.p>

            <ul className="feat-list">
              {[
                { icon: '⚡', title: 'Instant Recalculation', desc: 'Every expense and settlement updates all balances in real time.' },
                { icon: '📉', title: 'Net Balance View', desc: 'Credit minus debit gives each member a single clear net figure.' },
                { icon: '✅', title: 'Mark Settlements', desc: 'Record when someone pays up and the balance adjusts automatically.' },
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

          {/* Mock */}
          <motion.div
            initial={{ opacity: 0, x: 40 }} animate={visible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.15 }}
            style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}
          >
            <div style={{ position: 'absolute', width: 280, height: 280, background: 'radial-gradient(circle,rgba(124,108,250,0.15) 0%,transparent 70%)', borderRadius: '50%', pointerEvents: 'none', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
            <BalanceMock />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
