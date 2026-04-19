'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { listEndpoints, deleteEndpoint } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { BASE_URL } from '@/lib/api';

interface EndpointItem {
  endpoint_name: string;
  username: string;
  description?: string;
  input_fields: string[];
  output_schema: Record<string, unknown>;
  created_at: string;
}

export default function ViewAPIs() {
  const [endpoints, setEndpoints] = useState<EndpointItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const { username } = useAuth();
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listEndpoints(username || undefined);
      setEndpoints(data);
    } catch {}
    finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCopy = (ep: EndpointItem) => {
    navigator.clipboard.writeText(`${BASE_URL}/${ep.username}/${ep.endpoint_name}`);
    setCopiedUrl(ep.endpoint_name);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleDelete = async (ep: EndpointItem) => {
    const key = `${ep.username}/${ep.endpoint_name}`;
    if (deletingKey === key) {
      try {
        await deleteEndpoint(ep.username, ep.endpoint_name);
        load();
      } catch {}
      setDeletingKey(null);
    } else {
      setDeletingKey(key);
      setTimeout(() => setDeletingKey(null), 3000);
    }
  };

  const handleTest = (ep: EndpointItem) => {
    const params = new URLSearchParams({
      username: ep.username,
      endpoint: ep.endpoint_name,
      input_fields: JSON.stringify(ep.input_fields),
    });
    router.push(`/dashboard/test-api?${params.toString()}`);
  };

  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.12em', marginBottom: 6 }}>
            WORKSPACE
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em' }}>Your APIs</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4, fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''} registered
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border)' }}>
            {(['grid', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                style={{
                  padding: '8px 12px',
                  background: viewMode === v ? 'var(--accent-muted)' : 'transparent',
                  color: viewMode === v ? 'var(--accent)' : 'var(--text-dim)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  transition: 'all 0.15s',
                }}
              >
                {v === 'grid' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
          <button
            className="btn-primary"
            onClick={() => router.push('/dashboard/api-builder')}
            style={{ fontSize: 12, padding: '8px 16px' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New API
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-dim)' }}>
          <span className="cursor-blink">_</span> Loading endpoints...
        </div>
      ) : endpoints.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 40px', border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontFamily: "'IBM Plex Sans', sans-serif" }}>
            No endpoints registered yet.
          </p>
          <button className="btn-primary" onClick={() => router.push('/dashboard/api-builder')}>
            Build Your First API
          </button>
        </div>
      ) : (
        <div
          style={{
            display: viewMode === 'grid' ? 'grid' : 'flex',
            gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {endpoints.map((ep, i) => {
            const key = `${ep.username}/${ep.endpoint_name}`;
            const url = `${BASE_URL}/${ep.username}/${ep.endpoint_name}`;
            const isDeleting = deletingKey === key;

            return (
              <div
                key={key}
                className="panel fade-up"
                style={{ animationDelay: `${i * 0.05}s`, opacity: 0, transition: 'border-color 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                    <span className="method-badge" style={{ flexShrink: 0 }}>
                      POST
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      /{ep.username}/{ep.endpoint_name}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0, marginLeft: 8 }}>
                    {new Date(ep.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div style={{ padding: '14px 16px' }}>
                  {ep.description && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 14, fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.6 }}>
                      {ep.description}
                    </p>
                  )}

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>
                      INPUTS
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {ep.input_fields.map((f) => (
                        <span
                          key={f}
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-secondary)',
                            fontFamily: "'IBM Plex Mono', monospace",
                          }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '8px 12px', fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 14, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {url}
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    {/* Test */}
                    <button
                      onClick={() => handleTest(ep)}
                      className="btn-primary"
                      style={{ fontSize: 11, padding: '6px 12px', flex: 1 }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polygon points="5,3 19,12 5,21 5,3"/>
                      </svg>
                      Test
                    </button>

                    {/* Copy URL */}
                    <button
                      onClick={() => handleCopy(ep)}
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '6px 12px' }}
                      title="Copy URL"
                    >
                      {copiedUrl === ep.endpoint_name ? (
                        <>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
                            <polyline points="20,6 9,17 4,12"/>
                          </svg>
                          <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent)' }}>Copied!</span>
                        </>
                      ) : (
                        <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2"/>
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                          <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent)' }}>Copy URL</span>
                        </>
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => router.push(`/dashboard/edit-api/${ep.username}/${ep.endpoint_name}`)}
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '6px 12px' }}
                      title="Edit endpoint"
                    >
                      <>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent)' }}>Edit URL</span>
                      </>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(ep)}
                      className="btn-danger"
                      style={{ fontSize: 11, padding: '6px 10px' }}
                    >
                      {isDeleting ? (
                        '⚠ Confirm?'
                      ) : (
                        <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="M19,6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3,0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                        </svg>
                        <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent)' }}>Delete URL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}