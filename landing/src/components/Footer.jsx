const links = {
  Product:  ['Features', 'Dashboard', 'Group Splitting', 'Personal Finance', 'Budget Tracker'],
  Company:  ['About', 'Roadmap', 'Privacy Policy', 'Terms of Use'],
  Developer: ['API Docs', 'GitHub', 'Changelog'],
};

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '64px 0 36px', background: 'rgba(0,0,0,0.2)' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 56 }}>
          {/* Brand */}
          <div>
            <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-.02em', marginBottom: 16 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#7c6cfa,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>◎</div>
              PayCircle
            </a>
            <p style={{ fontSize: '.85rem', color: 'var(--text2)', lineHeight: 1.7, maxWidth: 260, marginBottom: 20 }}>
              The all-in-one finance app for students and young professionals. Split smart, track everything, owe nothing.
            </p>
            {/* Version badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(124,108,250,0.1)', border: '1px solid rgba(124,108,250,0.2)', borderRadius: 100, padding: '5px 13px', fontSize: 11, color: 'var(--accent2)', fontWeight: 700 }}>
              <span style={{ width: 6, height: 6, background: '#10d98a', borderRadius: '50%', display: 'inline-block' }} />
              v1.0 — MVP In Progress
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 18 }}>{section}</div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {items.map(item => (
                  <li key={item}>
                    <a href="#" style={{ fontSize: '.85rem', color: 'var(--text2)', transition: 'color .2s', fontWeight: 450 }}
                      onMouseEnter={e => e.target.style.color = 'var(--text)'}
                      onMouseLeave={e => e.target.style.color = 'var(--text2)'}
                    >{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 28 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ fontSize: '.82rem', color: 'var(--text2)' }}>
            © 2026 PayCircle. Built with ❤️ for students everywhere.
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            {['Privacy', 'Terms', 'Contact'].map(l => (
              <a key={l} href="#" style={{ fontSize: '.82rem', color: 'var(--text2)', transition: 'color .2s' }}
                onMouseEnter={e => e.target.style.color = 'var(--text)'}
                onMouseLeave={e => e.target.style.color = 'var(--text2)'}
              >{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
