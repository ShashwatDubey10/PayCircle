import { motion } from 'framer-motion';
import { useReveal } from '../hooks/useReveal';

const members = [
  { name: 'Ishashwat', avatar: '🧑', paid: 1800, owes: 0, color: '#10d98a' },
  { name: 'Aryan',     avatar: '👦', paid: 0,    owes: 600, color: '#ff5577' },
  { name: 'Simran',    avatar: '👧', paid: 0,    owes: 600, color: '#ff5577' },
  { name: 'Dev',       avatar: '🧒', paid: 0,    owes: 600, color: '#ff5577' },
];

const expenses = [
  { icon: '🍕', name: 'Pizza Night', amt: '₹800',  split: 'Equal · 4 people', date: 'Today' },
  { icon: '🚌', name: 'Bus Tickets', amt: '₹500',  split: 'Equal · 4 people', date: 'Yesterday' },
  { icon: '🏨', name: 'Hotel Stay',  amt: '₹2,400', split: 'Exact split',     date: '3 days ago' },
];

function GroupMock() {
  return (
    <div className="mock-card" style={{ maxWidth: 380 }}>
      {/* Group header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 3 }}>GROUP</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Goa Trip 🏖️</div>
        </div>
        <span className="mock-chip purple">4 members</span>
      </div>

      {/* Member balances */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {members.map(m => (
          <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(124,108,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{m.avatar}</div>
              <span style={{ fontSize: '.85rem', fontWeight: 600 }}>{m.name}</span>
            </div>
            <div style={{ fontSize: '.82rem', fontWeight: 700, color: m.color }}>
              {m.paid > 0 ? `+₹${m.paid.toLocaleString()}` : `-₹${m.owes}`}
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 18 }} />

      {/* Recent expenses */}
      <div style={{ fontSize: 9, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>Recent Expenses</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {expenses.map(e => (
          <div key={e.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{e.icon}</span>
              <div>
                <div style={{ fontSize: '.82rem', fontWeight: 600 }}>{e.name}</div>
                <div style={{ fontSize: '.72rem', color: 'var(--text2)' }}>{e.split} · {e.date}</div>
              </div>
            </div>
            <div style={{ fontSize: '.85rem', fontWeight: 800 }}>{e.amt}</div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(124,108,250,0.07)', borderRadius: 12, border: '1px solid rgba(124,108,250,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '.82rem', color: 'var(--text2)' }}>Total Group Spend</span>
        <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--accent2)' }}>₹3,700</span>
      </div>
    </div>
  );
}

export default function GroupSection() {
  const [ref, visible] = useReveal();
  return (
    <section id="groups" className="section" ref={ref}>
      <div className="container">
        <div className="two-col">
          {/* Text */}
          <div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="section-tag">Group Expenses</motion.div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} animate={visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55, delay: 0.07 }} className="section-title">
              Split bills with<br /><span className="grad-text">zero drama.</span>
            </motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={visible ? { opacity: 1 } : {}} transition={{ duration: 0.5, delay: 0.13 }} className="section-sub">
              Create groups for any occasion — roommates, road trips, or dinner nights. Add expenses on the fly and let PayCircle handle who owes whom.
            </motion.p>

            <ul className="feat-list">
              {[
                { icon: '⚖️', title: 'Equal & Exact Splits', desc: 'Divide equally among all or set custom amounts per person.' },
                { icon: '🔄', title: 'Live Balance Sync', desc: 'Balances recalculate instantly when any expense or settlement is logged.' },
                { icon: '🛡️', title: 'Admin Controls', desc: 'Group admin can add/remove members and manage permissions.' },
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
            <div style={{ position: 'absolute', width: 280, height: 280, background: 'radial-gradient(circle,rgba(124,108,250,0.18) 0%,transparent 70%)', borderRadius: '50%', pointerEvents: 'none', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
            <GroupMock />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
