import { motion } from 'framer-motion';
import { useReveal } from '../hooks/useReveal';

const steps = [
  {
    num: '01',
    icon: '📲',
    title: 'Create Your Account',
    desc: 'Sign up in seconds. Secure JWT authentication keeps your data safe. No credit card, no nonsense.',
    detail: ['Bcrypt password hashing', '7-day JWT session', 'Instant onboarding'],
  },
  {
    num: '02',
    icon: '👥',
    title: 'Add Groups & Expenses',
    desc: 'Create a group, invite friends by email, and start logging expenses. Choose equal or custom splits.',
    detail: ['Invite by email', 'Equal or exact split', 'Multiple categories'],
  },
  {
    num: '03',
    icon: '📊',
    title: 'Track Your Personal Finance',
    desc: 'Log your own income and expenses. 10 categories keep everything organized alongside your group activity.',
    detail: ['10 smart categories', 'Income + expense tracking', 'Budget limits'],
  },
  {
    num: '04',
    icon: '✅',
    title: 'Settle Up & Stay Clear',
    desc: 'View simplified debt suggestions. Record payments when they happen — balances update in real time.',
    detail: ['Optimized debt list', 'Mark settlements', 'Live balance sync'],
  },
];

export default function HowItWorks() {
  const [ref, visible] = useReveal();
  return (
    <section id="how" className="section" ref={ref}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="section-tag" style={{ margin: '0 auto 18px' }}>How It Works</motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55, delay: 0.08 }} className="section-title">
            Up and running<br /><span className="grad-text">in 4 steps.</span>
          </motion.h2>
        </div>

        {/* Steps */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{ position: 'relative', padding: '28px 24px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22 }}
            >
              {/* Step number */}
              <div style={{ position: 'absolute', top: 20, right: 22, fontSize: '.72rem', fontWeight: 900, color: 'rgba(124,108,250,0.25)', letterSpacing: '.06em' }}>{s.num}</div>

              {/* Icon */}
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(124,108,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 18 }}>{s.icon}</div>

              <div style={{ fontSize: '.95rem', fontWeight: 800, marginBottom: 10 }}>{s.title}</div>
              <div style={{ fontSize: '.82rem', color: 'var(--text2)', lineHeight: 1.65, marginBottom: 18 }}>{s.desc}</div>

              {/* Detail chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {s.detail.map(d => (
                  <span key={d} style={{ fontSize: 10, padding: '3px 10px', background: 'rgba(124,108,250,0.1)', color: 'var(--accent2)', borderRadius: 100, fontWeight: 600 }}>{d}</span>
                ))}
              </div>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <div style={{ position: 'absolute', right: -11, top: '50%', transform: 'translateY(-50%)', width: 22, height: 2, background: 'linear-gradient(90deg,rgba(124,108,250,0.3),transparent)', display: 'none' }} className="hiw-connector" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
