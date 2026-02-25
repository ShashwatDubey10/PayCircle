const items = [
  'Group Expense Splitting', 'Personal Finance Tracking', 'Real-time Balance Engine',
  'Monthly Budget Alerts', 'Settlement Optimization', 'Smart Category Insights',
  'Income & Expense Tracking', 'Unified Dashboard', 'Admin Role Management',
  'Equal & Exact Splits', 'Net Cashflow Tracking', 'Secure JWT Auth',
];

export default function Marquee() {
  const all = [...items, ...items];
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '18px 0', overflow: 'hidden', background: 'rgba(255,255,255,0.015)', position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', gap: 56, width: 'max-content', animation: 'marquee 35s linear infinite' }}>
        {all.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap', fontSize: '.82rem', fontWeight: 600, color: '#8888aa', letterSpacing: '.04em' }}>
            <span style={{ color: '#a78bfa', fontSize: 15 }}>◎</span>
            {item}
          </div>
        ))}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}
