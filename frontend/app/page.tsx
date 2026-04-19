'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const TAGLINE_WORDS = ['Dynamic.', 'Powerful.', 'Instant.'];

export default function LandingPage() {
  const [wordIdx, setWordIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [typing, setTyping] = useState(true);

  // Typewriter effect for rotating words
  useEffect(() => {
    const word = TAGLINE_WORDS[wordIdx];
    if (typing) {
      if (displayed.length < word.length) {
        const t = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 80);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setTyping(false), 1400);
        return () => clearTimeout(t);
      }
    } else {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 50);
        return () => clearTimeout(t);
      } else {
        setWordIdx((i) => (i + 1) % TAGLINE_WORDS.length);
        setTyping(true);
      }
    }
  }, [displayed, typing, wordIdx]);

  return (
    <main
      className="grid-bg"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Corner decorations */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: 120, height: 120,
        borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        opacity: 0.4,
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 120, height: 120,
        borderLeft: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        opacity: 0.4,
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        width: 120, height: 120,
        borderRight: '1px solid var(--border)',
        borderTop: '1px solid var(--border)',
        opacity: 0.4,
      }} />
      <div style={{
        position: 'absolute', bottom: 0, right: 0,
        width: 120, height: 120,
        borderLeft: '1px solid var(--border)',
        borderTop: '1px solid var(--border)',
        opacity: 0.4,
      }} />

      {/* Glowing orb */}
      <div style={{
        position: 'absolute',
        top: '20%', left: '50%',
        transform: 'translateX(-50%)',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(0,255,136,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Nav */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 40px',
        borderBottom: '1px solid var(--border)',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28,
            background: 'var(--accent)',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          }} />
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '0.1em' }}>MACH<span style={{ color: 'var(--accent)' }}>API</span></span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a
            href="https://github.com/MihirRajeshPanchal/MachAPI"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
            style={{ padding: '8px 16px', fontSize: 12, textDecoration: 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </a>
          <Link href="/login">
            <button className="btn-ghost" style={{ padding: '8px 16px', fontSize: 13 }}>Login</button>
          </Link>
          <Link href="/login?mode=register">
            <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>Sign Up</button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 40px',
        position: 'relative',
        zIndex: 10,
      }}>
        <div className="fade-up fade-up-1">
          <span className="tag" style={{ marginBottom: 24, display: 'inline-block' }}>v2.0.0 — Now in Beta</span>
        </div>

        <h1 className="fade-up fade-up-2" style={{
          fontSize: 'clamp(48px, 8vw, 96px)',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.0,
          marginBottom: 6,
        }}>
          MACH<span style={{ color: 'var(--accent)' }}>API</span>
        </h1>

        <div className="fade-up fade-up-2" style={{
          fontSize: 'clamp(18px, 3vw, 28px)',
          color: 'var(--accent)',
          fontWeight: 300,
          letterSpacing: '0.15em',
          marginBottom: 16,
          height: '1.4em',
        }}>
          {displayed}<span className="cursor-blink" style={{ color: 'var(--accent)' }}>_</span>
        </div>

        <p className="fade-up fade-up-3" style={{
          maxWidth: 560,
          color: 'var(--text-secondary)',
          fontSize: 15,
          lineHeight: 1.8,
          marginBottom: 24,
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}>
          Register custom AI-powered endpoints at runtime.<br />
          Define inputs, set a prompt, get a typed JSON API — instantly.
        </p>

        <div className="fade-up fade-up-4" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/login?mode=register">
            <button className="btn-primary" style={{ fontSize: 14, padding: '14px 28px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Start Building
            </button>
          </Link>
          <a href="https://github.com/MihirRajeshPanchal/MachAPI" target="_blank" rel="noopener noreferrer">
            <button className="btn-ghost" style={{ fontSize: 14, padding: '14px 28px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
              View on GitHub
            </button>
          </a>
        </div>

        {/* Feature pills */}
        {/* <div className="fade-up fade-up-5" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            '⚡ Runtime Endpoint Registration',
            '🧠 Gemini AI Backed',
            '🔒 JWT Auth',
            '📦 PostgreSQL Persistence',
            '🎯 JSON Schema Output',
          ].map((f) => (
            <span key={f} style={{
              padding: '6px 14px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: 12,
            }}>{f}</span>
          ))}
        </div> */}
      </div>

      {/* Terminal preview */}
      <div className="fade-up fade-up-5" style={{
        maxWidth: 680,
        margin: '0 auto 60px',
        padding: '0 40px',
        width: '100%',
        position: 'relative',
        zIndex: 10,
      }}>
        <div className="panel" style={{ overflow: 'hidden' }}>
          <div style={{
            background: 'var(--bg-elevated)',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
            <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 8 }}>POST /mihir/sentiment-analyzer</span>
          </div>
          <div style={{ padding: '20px 24px', fontSize: 12, lineHeight: 2 }}>
            <div><span style={{ color: 'var(--text-dim)' }}>$</span> <span style={{ color: 'var(--accent)' }}>curl</span> <span style={{ color: 'var(--text-secondary)' }}>-X POST https://machapi.vercel.app/mihir/sentiment-analyzer</span></div>
            <div style={{ color: 'var(--text-dim)', paddingLeft: 16 }}>{`{ "inputs": { "text": "I love this product!" } }`}</div>
            <div style={{ marginTop: 12, color: 'var(--text-dim)' }}>→</div>
            <div style={{ color: 'var(--accent)', paddingLeft: 16 }}>{`{ "sentiment": "positive", "confidence": 0.97 }`}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '20px 40px',
        borderTop: '1px solid var(--border)',
        color: 'var(--text-dim)',
        fontSize: 12,
        position: 'relative',
        zIndex: 10,
      }}>
        made with <span style={{ color: 'var(--red)' }}>♥</span> by <span style={{ color: 'var(--text-secondary)' }}><a href="https://mihirrajeshpanchal.github.io/" target="_blank" rel="noopener noreferrer"><span style={{ color: 'var(--accent)' }}>Mihir Panchal</span></a></span>
      </footer>
    </main>
  );
}
