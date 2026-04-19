'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loginUser, registerUser } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

function LoginForm() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>(
    searchParams.get('mode') === 'register' ? 'register' : 'login'
  );
  const [form, setForm] = useState({ username: '', password: '', gemini_api_key: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard/view-apis');
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await registerUser(form.username, form.password, form.gemini_api_key || undefined);
        // Auto-login after register
        const res = await loginUser(form.username, form.password);
        login(res.username, res.token);
      } else {
        const res = await loginUser(form.username, form.password);
        login(res.username, res.token);
      }
      router.push('/dashboard/view-apis');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
    }} className="grid-bg">

      {/* Back link */}
      <Link href="/" style={{
        position: 'absolute', top: 24, left: 32,
        display: 'flex', alignItems: 'center', gap: 8,
        color: 'var(--text-dim)', textDecoration: 'none',
        fontSize: 12, letterSpacing: '0.05em',
        transition: 'color 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15,18 9,12 15,6"/>
        </svg>
        BACK
      </Link>

      <div className="fade-up fade-up-1" style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 24, height: 24,
              background: 'var(--accent)',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }} />
            <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '0.1em' }}>
              MACH<span style={{ color: 'var(--accent)' }}>API</span>
            </span>
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>
            {mode === 'login' ? 'Welcome back, engineer.' : 'Create your account.'}
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{
          display: 'flex',
          border: '1px solid var(--border)',
          marginBottom: 32,
        }}>
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              style={{
                flex: 1,
                padding: '10px',
                background: mode === m ? 'var(--accent-muted)' : 'transparent',
                color: mode === m ? 'var(--accent)' : 'var(--text-dim)',
                border: 'none',
                borderBottom: mode === m ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}
            >
              {m === 'login' ? '// Login' : '// Register'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>
              USERNAME
            </label>
            <input
              className="input-field"
              type="text"
              placeholder="your_username"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>
              PASSWORD
            </label>
            <input
              className="input-field"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === 'register' && (
            <div className="fade-up">
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>
                GEMINI API KEY <span style={{ color: 'var(--text-dim)' }}>(optional)</span>
              </label>
              <input
                className="input-field"
                type="password"
                placeholder="AIza..."
                value={form.gemini_api_key}
                onChange={e => setForm({ ...form, gemini_api_key: e.target.value })}
                autoComplete="off"
              />
              <p style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 6 }}>
                You can add this later via account settings.
              </p>
            </div>
          )}

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--red-muted)',
              border: '1px solid rgba(255,68,68,0.3)',
              color: 'var(--red)',
              fontSize: 12,
            }}>
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 8, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <>
                <span className="cursor-blink">_</span>
                {mode === 'login' ? 'Authenticating...' : 'Creating account...'}
              </>
            ) : (
              mode === 'login' ? '→ Login' : '→ Create Account'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 11, marginTop: 24 }}>
          made with <span style={{ color: 'var(--red)' }}>♥</span> by Mihir Panchal
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
