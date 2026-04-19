'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BASE_URL } from '@/lib/api';
import Link from 'next/link';

function getPlaceholderForField(fieldName: string): string {
  const n = fieldName.toLowerCase();
  if (n.includes('text') || n.includes('content') || n.includes('message'))
    return 'The quick brown fox jumps over the lazy dog.';
  if (n.includes('url') || n.includes('link')) return 'https://example.com';
  if (n.includes('email')) return 'user@example.com';
  if (n.includes('name')) return 'John Doe';
  if (n.includes('number') || n.includes('count') || n.includes('age')) return '42';
  if (n.includes('date')) return '2025-01-01';
  if (n.includes('query') || n.includes('search')) return 'What is machine learning?';
  if (n.includes('title')) return 'Sample Title';
  if (n.includes('description') || n.includes('summary')) return 'A brief description of something interesting.';
  if (n.includes('topic') || n.includes('subject')) return 'Artificial Intelligence';
  if (n.includes('language') || n.includes('lang')) return 'English';
  if (n.includes('category')) return 'Technology';
  return `Sample ${fieldName}`;
}

export default function TestAPIPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const username = searchParams.get('username') || '';
  const endpoint = searchParams.get('endpoint') || '';
  const inputFieldsParam = searchParams.get('input_fields');
  const inputFields: string[] = inputFieldsParam ? JSON.parse(inputFieldsParam) : [];

  const [mode, setMode] = useState<'json' | 'form'>('json');
  const [jsonInput, setJsonInput] = useState('');
  const [formInputs, setFormInputs] = useState<Record<string, string>>(
    Object.fromEntries(inputFields.map((f) => [f, '']))
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const fillPlaceholders = () => {
    if (mode === 'form') {
      setFormInputs(Object.fromEntries(inputFields.map((f) => [f, getPlaceholderForField(f)])));
    } else {
      const sample = Object.fromEntries(inputFields.map((f) => [f, getPlaceholderForField(f)]));
      setJsonInput(JSON.stringify({ inputs: sample }, null, 2));
    }
  };

  const handleTest = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      let payload: Record<string, unknown>;
      
      if (mode === 'json') {
        try {
          const parsed = JSON.parse(jsonInput);
          payload = parsed.inputs ? parsed : { inputs: parsed };
        } catch {
          throw new Error('Invalid JSON format');
        }
      } else {
        payload = { inputs: formInputs };
      }

      const res = await fetch(`${BASE_URL}/${username}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setResult(data.result ?? data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const resultStr = result ? JSON.stringify(result, null, 2) : '';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 48px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button
            className="btn-ghost"
            onClick={() => router.back()}
            style={{ fontSize: 11, padding: '5px 10px' }}
          >
            ← Back
          </button>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.12em' }}>
            TEST ENDPOINT
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span className="method-badge">POST</span>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>
            /{username}/{endpoint}
          </h1>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
          {`${BASE_URL}/${username}/${endpoint}`}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
        {/* Left: Input */}
        <div className="panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
              REQUEST INPUT
            </div>
            
            {/* Mode toggle */}
            <div style={{ display: 'flex', border: '1px solid var(--border)' }}>
              {(['json', 'form'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: '5px 14px',
                    background: mode === m ? 'var(--accent-muted)' : 'transparent',
                    color: mode === m ? 'var(--accent)' : 'var(--text-dim)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11,
                    letterSpacing: '0.05em',
                    transition: 'all 0.15s',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {m === 'json' ? 'JSON' : 'FORM'}
                </button>
              ))}
            </div>
          </div>

          {mode === 'json' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: "'IBM Plex Mono', monospace" }}>
                  Paste JSON payload
                </label>
                <button
                  className="btn-ghost"
                  onClick={fillPlaceholders}
                  style={{ fontSize: 10, padding: '4px 10px' }}
                >
                  Fill Example
                </button>
              </div>
              <textarea
                className="input-field"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={`{\n  "inputs": {\n    ${inputFields.map((f) => `"${f}": "..."`).join(',\n    ')}\n  }\n}`}
                style={{
                  width: '100%',
                  minHeight: 280,
                  resize: 'vertical',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  lineHeight: 1.7,
                }}
              />
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  Fill input fields
                </label>
                <button
                  className="btn-ghost"
                  onClick={fillPlaceholders}
                  style={{ fontSize: 10, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                  Fill Placeholders
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {inputFields.map((field) => (
                  <div key={field}>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {field}
                    </label>
                    <input
                      className="input-field"
                      value={formInputs[field] ?? ''}
                      onChange={(e) => setFormInputs((prev) => ({ ...prev, [field]: e.target.value }))}
                      placeholder={getPlaceholderForField(field)}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleTest}
            disabled={loading}
            style={{
              width: '100%',
              justifyContent: 'center',
              marginTop: 16,
              opacity: loading ? 0.7 : 1,
              padding: 11,
            }}
          >
            {loading ? (
              <>
                <span className="cursor-blink">_</span> Calling endpoint...
              </>
            ) : (
              <>⚡ Send Request</>
            )}
          </button>

          {error && (
            <div style={{ padding: '10px 14px', background: 'var(--red-muted)', border: '1px solid rgba(255,68,68,0.3)', color: 'var(--red)', fontSize: 12, marginTop: 16 }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Right: Response */}
        <div className="panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
              RESPONSE
            </div>
            {result !== null && (
              <button
                className="btn-ghost"
                onClick={() => {
                  navigator.clipboard.writeText(resultStr);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                style={{ fontSize: 11, padding: '4px 10px' }}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            )}
          </div>

          {result === null ? (
            <div style={{ border: '1px dashed var(--border)', padding: '60px 24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Response will appear here after sending request
            </div>
          ) : (
            <pre style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '14px 16px', fontSize: 12, color: 'var(--accent)', overflow: 'auto', maxHeight: 420, lineHeight: 1.7, fontFamily: "'IBM Plex Mono', monospace" }}>
              {resultStr}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}