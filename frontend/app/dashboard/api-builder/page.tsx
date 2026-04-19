'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerEndpoint } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface InputField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  description: string;
}

const FIELD_TYPES = ['string', 'number', 'boolean', 'array', 'object'];

const DEFAULT_OUTPUT_SCHEMA = `{
  "title": "MyResult",
  "type": "object",
  "required": ["result"],
  "properties": {
    "result": { "type": "string" }
  }
}`;

type Step = 1 | 2 | 3 | 4;

export default function APIBuilder() {
  const [step, setStep] = useState<Step>(1);
  const [endpointName, setEndpointName] = useState('');
  const [description, setDescription] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [inputFields, setInputFields] = useState<InputField[]>([
    { name: '', label: '', type: 'string', required: true, description: '' },
  ]);
  const [outputSchema, setOutputSchema] = useState(DEFAULT_OUTPUT_SCHEMA);
  const [schemaError, setSchemaError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { username } = useAuth();
  const router = useRouter();

  const addField = () => {
    setInputFields([...inputFields, { name: '', label: '', type: 'string', required: true, description: '' }]);
  };

  const removeField = (i: number) => {
    setInputFields(inputFields.filter((_, idx) => idx !== i));
  };

  const updateField = (i: number, key: keyof InputField, value: string | boolean) => {
    const updated = [...inputFields];
    (updated[i] as Record<string, string | boolean>)[key] = value;
    setInputFields(updated);
  };

  const validateSchema = (val: string) => {
    try { JSON.parse(val); setSchemaError(''); return true; }
    catch (e: unknown) { setSchemaError(e instanceof Error ? e.message : 'Invalid JSON'); return false; }
  };

  const handleBuild = async () => {
    if (!validateSchema(outputSchema)) return;
    setLoading(true); setError('');
    try {
      const payload = {
        endpoint_name: endpointName.trim().toLowerCase().replace(/\s+/g, '_'),
        username: username!,
        input_fields: inputFields.filter(f => f.name.trim()),
        output_schema: JSON.parse(outputSchema),
        ai_prompt: aiPrompt,
        description,
        gemini_api_key: geminiKey || undefined,
      };
      await registerEndpoint(payload);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Build failed');
    } finally {
      setLoading(false);
    }
  };

  const STEPS = [
    { n: 1, label: 'Basics' },
    { n: 2, label: 'Inputs' },
    { n: 3, label: 'Output Schema' },
    { n: 4, label: 'AI Prompt' },
  ];

  if (success) {
    const name = endpointName.trim().toLowerCase().replace(/\s+/g, '_');
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 40, flexDirection: 'column', gap: 24,
      }}>
        <div style={{ textAlign: 'center' }} className="fade-up fade-up-1">
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Endpoint deployed!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Your API is live at:
          </p>
        </div>
        <div className="panel fade-up fade-up-2" style={{ padding: '16px 24px', maxWidth: 480, width: '100%' }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>POST</div>
          <div style={{ fontSize: 13, color: 'var(--accent)' }}>
            {`${typeof window !== 'undefined' ? window.location.origin.replace('3000', '8000') : 'http://localhost:8000'}/${username}/${name}`}
          </div>
        </div>
        <div className="fade-up fade-up-3" style={{ display: 'flex', gap: 12 }}>
          <button className="btn-ghost" onClick={() => { setSuccess(false); setStep(1); setEndpointName(''); setDescription(''); setAiPrompt(''); setInputFields([{ name: '', label: '', type: 'string', required: true, description: '' }]); setOutputSchema(DEFAULT_OUTPUT_SCHEMA); }}>
            Build Another
          </button>
          <button className="btn-primary" onClick={() => router.push('/dashboard/view-apis')}>
            → View All APIs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 800 }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.12em', marginBottom: 6 }}>BUILD</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em' }}>API Builder</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4, fontFamily: "'IBM Plex Sans', sans-serif" }}>
          Define your endpoint, inputs, and AI behavior.
        </p>
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 40, borderBottom: '1px solid var(--border)' }}>
        {STEPS.map(({ n, label }) => (
          <button
            key={n}
            onClick={() => setStep(n as Step)}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: step === n ? '2px solid var(--accent)' : '2px solid transparent',
              color: step === n ? 'var(--accent)' : step > n ? 'var(--text-secondary)' : 'var(--text-dim)',
              cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s',
              marginBottom: -1,
            }}
          >
            <span style={{
              width: 18, height: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
              background: step === n ? 'var(--accent-muted)' : step > n ? 'rgba(0,255,136,0.1)' : 'var(--bg-elevated)',
              border: `1px solid ${step === n ? 'var(--accent-border)' : 'var(--border)'}`,
              color: step > n || step === n ? 'var(--accent)' : 'var(--text-dim)',
            }}>
              {step > n ? '✓' : n}
            </span>
            {label}
          </button>
        ))}
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>
              ENDPOINT NAME <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <span style={{
                padding: '10px 14px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRight: 'none',
                color: 'var(--text-dim)',
                fontSize: 12,
                whiteSpace: 'nowrap',
              }}>/{username}/</span>
              <input
                className="input-field"
                value={endpointName}
                onChange={e => setEndpointName(e.target.value)}
                placeholder="sentiment-analyzer"
                style={{ flex: 1 }}
              />
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 6 }}>
              Alphanumeric, hyphens, underscores only.
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>
              DESCRIPTION
            </label>
            <input
              className="input-field"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Analyzes the sentiment of a given text"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>
              GEMINI API KEY <span style={{ color: 'var(--text-dim)' }}>(uses stored key if blank)</span>
            </label>
            <input
              className="input-field"
              type="password"
              value={geminiKey}
              onChange={e => setGeminiKey(e.target.value)}
              placeholder="AIza..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
            <button
              className="btn-primary"
              onClick={() => setStep(2)}
              disabled={!endpointName.trim()}
              style={{ opacity: endpointName.trim() ? 1 : 0.4 }}
            >
              Next: Define Inputs →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Input Fields */}
      {step === 2 && (
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif" }}>
              Define the inputs your endpoint will accept.
            </p>
            <button className="btn-ghost" onClick={addField} style={{ fontSize: 12, padding: '6px 14px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Field
            </button>
          </div>

          {inputFields.map((field, i) => (
            <div key={i} className="panel-elevated" style={{ padding: '16px', position: 'relative' }}>
              <div style={{
                position: 'absolute', top: 12, right: 12,
                fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em',
                background: 'var(--bg-panel)',
                padding: '2px 8px',
                border: '1px solid var(--border)',
              }}>FIELD {i + 1}</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 5 }}>
                    NAME <span style={{ color: 'var(--red)' }}>*</span>
                  </label>
                  <input
                    className="input-field"
                    value={field.name}
                    onChange={e => updateField(i, 'name', e.target.value)}
                    placeholder="text_input"
                    style={{ fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 5 }}>
                    LABEL
                  </label>
                  <input
                    className="input-field"
                    value={field.label}
                    onChange={e => updateField(i, 'label', e.target.value)}
                    placeholder="Text Input"
                    style={{ fontSize: 12 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 5 }}>
                    TYPE
                  </label>
                  <select
                    className="input-field"
                    value={field.type}
                    onChange={e => updateField(i, 'type', e.target.value)}
                    style={{ fontSize: 12, cursor: 'pointer' }}
                  >
                    {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 5 }}>
                    DESCRIPTION
                  </label>
                  <input
                    className="input-field"
                    value={field.description}
                    onChange={e => updateField(i, 'description', e.target.value)}
                    placeholder="Optional hint"
                    style={{ fontSize: 12 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 1 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={e => updateField(i, 'required', e.target.checked)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    Required
                  </label>
                  {inputFields.length > 1 && (
                    <button onClick={() => removeField(i)} className="btn-danger" style={{ fontSize: 11, padding: '6px 8px' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8 }}>
            <button className="btn-ghost" onClick={() => setStep(1)} style={{ fontSize: 12 }}>← Back</button>
            <button
              className="btn-primary"
              onClick={() => setStep(3)}
              disabled={inputFields.every(f => !f.name.trim())}
              style={{ opacity: inputFields.some(f => f.name.trim()) ? 1 : 0.4 }}
            >
              Next: Output Schema →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Output Schema */}
      {step === 3 && (
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif", marginBottom: 16 }}>
              Define a JSON Schema for the AI output. The model will always return this exact shape.
            </p>

            {/* Quick templates */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: 'var(--text-dim)', alignSelf: 'center', marginRight: 4 }}>TEMPLATES:</span>
              {[
                {
                  label: 'Sentiment',
                  schema: `{\n  "title": "SentimentResult",\n  "type": "object",\n  "required": ["sentiment", "confidence"],\n  "properties": {\n    "sentiment": { "type": "string", "enum": ["positive", "negative", "neutral"] },\n    "confidence": { "type": "number" }\n  }\n}`,
                },
                {
                  label: 'Summary',
                  schema: `{\n  "title": "SummaryResult",\n  "type": "object",\n  "required": ["summary", "key_points"],\n  "properties": {\n    "summary": { "type": "string" },\n    "key_points": { "type": "array", "items": { "type": "string" } }\n  }\n}`,
                },
                {
                  label: 'Classification',
                  schema: `{\n  "title": "ClassificationResult",\n  "type": "object",\n  "required": ["category", "score"],\n  "properties": {\n    "category": { "type": "string" },\n    "score": { "type": "number" },\n    "reasoning": { "type": "string" }\n  }\n}`,
                },
              ].map(t => (
                <button
                  key={t.label}
                  onClick={() => { setOutputSchema(t.schema); setSchemaError(''); }}
                  className="btn-ghost"
                  style={{ fontSize: 11, padding: '4px 12px' }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <textarea
              className="input-field"
              value={outputSchema}
              onChange={e => { setOutputSchema(e.target.value); validateSchema(e.target.value); }}
              style={{
                width: '100%',
                minHeight: 260,
                resize: 'vertical',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                lineHeight: 1.8,
              }}
              spellCheck={false}
            />
            {schemaError && (
              <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 6 }}>⚠ {schemaError}</div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8 }}>
            <button className="btn-ghost" onClick={() => setStep(2)} style={{ fontSize: 12 }}>← Back</button>
            <button
              className="btn-primary"
              onClick={() => { if (validateSchema(outputSchema)) setStep(4); }}
              disabled={!!schemaError}
              style={{ opacity: schemaError ? 0.4 : 1 }}
            >
              Next: AI Prompt →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: AI Prompt + Build */}
      {step === 4 && (
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>
              AI SYSTEM PROMPT <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: "'IBM Plex Sans', sans-serif", marginBottom: 10 }}>
              Tell the AI what to do. Input field values will be injected automatically.
            </p>
            <textarea
              className="input-field"
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder={`You are a sentiment analyzer. Given the input text, determine its emotional tone and return the result as specified.`}
              style={{
                width: '100%',
                minHeight: 160,
                resize: 'vertical',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            />
          </div>

          {/* Summary */}
          <div className="panel-elevated" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 14 }}>BUILD SUMMARY</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                { label: 'ENDPOINT', value: `/${username}/${endpointName.toLowerCase().replace(/\s+/g, '_')}` },
                { label: 'INPUTS', value: inputFields.filter(f => f.name).map(f => f.name).join(', ') || '—' },
                { label: 'OUTPUT', value: (() => { try { return JSON.parse(outputSchema).title || 'Custom Schema'; } catch { return 'Invalid'; } })() },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', minWidth: 70 }}>{label}</span>
                  <span style={{ fontSize: 12, color: 'var(--accent)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'var(--red-muted)', border: '1px solid rgba(255,68,68,0.3)', color: 'var(--red)', fontSize: 12 }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8 }}>
            <button className="btn-ghost" onClick={() => setStep(3)} style={{ fontSize: 12 }}>← Back</button>
            <button
              className="btn-primary"
              onClick={handleBuild}
              disabled={loading || !aiPrompt.trim()}
              style={{
                opacity: (!aiPrompt.trim() || loading) ? 0.5 : 1,
                padding: '12px 28px',
                fontSize: 14,
              }}
            >
              {loading ? (
                <><span className="cursor-blink">_</span> Building...</>
              ) : (
                <>⚡ Deploy Endpoint</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
