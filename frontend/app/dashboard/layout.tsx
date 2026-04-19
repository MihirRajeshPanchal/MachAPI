'use client';
import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

const NAV: NavItem[] = [
  {
    label: 'View APIs',
    href: '/dashboard/view-apis',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    label: 'API Builder',
    href: '/dashboard/api-builder',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/>
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, username, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          <Link href="/" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            textDecoration: 'none',
          }}>
            <div style={{
              width: 20, height: 20,
              background: 'var(--accent)',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              flexShrink: 0,
            }} />
            <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.1em', color: 'var(--text-primary)' }}>
              MACH<span style={{ color: 'var(--accent)' }}>API</span>
            </span>
          </Link>
        </div>

        {/* User badge */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{
            width: 28, height: 28,
            background: 'var(--accent-muted)',
            border: '1px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: 'var(--accent)', fontWeight: 700, flexShrink: 0,
          }}>
            {username?.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {username}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          <div style={{ padding: '6px 16px 8px', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.12em' }}>
            WORKSPACE
          </div>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div
                className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
              >
                {item.icon}
                {item.label}
              </div>
            </Link>
          ))}
        </nav>

        {/* Bottom: logout */}
        <div style={{ padding: '12px 0', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={logout}
            className="sidebar-link"
            style={{ color: 'var(--text-dim)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        {children}
      </main>
    </div>
  );
}
