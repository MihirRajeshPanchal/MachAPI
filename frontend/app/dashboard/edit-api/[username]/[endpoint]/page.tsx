'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { BASE_URL } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────
interface DetectedField {
  name: string;
  type: string;
  required: boolean;
}

interface DetectedOutputProp {
  name: string;
  type: string;
  required: boolean;
  enumValues: string;
  arrayItemType: 'string' | 'number' | 'boolean';
}

type Step = 1 | 2 | 3 | 4;

// ── Helpers ────────────────────────────────────────────────────────────────────
function inferType(value: unknown): string {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object' && value !== null) return 'object';
  return 'string';
}

function inferArrayItemType(value: unknown[]): 'string' | 'number' | 'boolean' {
  if (value.length === 0) return 'string';
  if (typeof value[0] === 'number') return 'number';
  if (typeof value[0] === 'boolean') return 'boolean';
  return 'string';
}

function schemaToOutputProps(schema: Record<string, unknown>): DetectedOutputProp[] {
  const properties = (schema.properties as Record<string, Record<string, unknown>>) || {};
  const requiredList = (schema.required as string[]) || [];

  return Object.entries(properties).map(([name, def]) => {
    const type = (def.type as string) || 'string';
    const enumValues = Array.isArray(def.enum)
      ? (def.enum as string[]).join(', ')
      : '';

    let arrayItemType: 'string' | 'number' | 'boolean' = 'string';
    if (type === 'array' && def.items && typeof def.items === 'object') {
      const itemType = (def.items as Record<string, string>).type;
      if (itemType === 'number' || itemType === 'boolean') arrayItemType = itemType;
    }

    return {
      name,
      type,
      required: requiredList.includes(name),
      enumValues,
      arrayItemType,
    };
  });
}

function buildJsonSchema(
  title: string,
  props: DetectedOutputProp[]
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const p of props) {
    if (!p.name.trim()) continue;
    if (p.required) required.push(p.name.trim());
    const def: Record<string, unknown> = { type: p.type };
    if (p.type === 'string' && p.enumValues.trim()) {
      const vals = p.enumValues.split(',').map((v) => v.trim()).filter(Boolean);
      if (vals.length) def.enum = vals;
    }
    if (p.type === 'array') def.items = { type: p.arrayItemType };
    properties[p.name.trim()] = def;
  }

  return {
    title: title || 'MyResult',
    type: 'object',
    ...(required.length ? { required } : {}),
    properties,
  };
}

// ── JSON Paste + Key Detector ──────────────────────────────────────────────────
function JsonKeyDetector({
  label,
  placeholder,
  fields,
  onFieldsChange,
  jsonText,
  onJsonTextChange,
  parseError,
  onParseErrorChange,
  showEnumAndArray,
  schemaTitle,
  onSchemaTitleChange,
}: {
  label: string;
  placeholder: string;
  fields: DetectedField[] | DetectedOutputProp[];
  onFieldsChange: (f: DetectedField[] | DetectedOutputProp[]) => void;
  jsonText: string;
  onJsonTextChange: (t: string) => void;
  parseError: string;
  onParseErrorChange: (e: string) => void;
  showEnumAndArray?: boolean;
  schemaTitle?: string;
  onSchemaTitleChange?: (t: string) => void;
}) {
  const handleChange = (text: string) => {
    onJsonTextChange(text);
    if (!text.trim()) {
      onParseErrorChange('');
      return;
    }
    try {
      const parsed = JSON.parse(text);
      const data =
        parsed.inputs && typeof parsed.inputs === 'object' ? parsed.inputs : parsed;
      if (typeof data !== 'object' || Array.isArray(data)) {
        onParseErrorChange('Root must be a JSON object.');
        return;
      }
      onParseErrorChange('');
      if (showEnumAndArray) {
        onFieldsChange(
          Object.entries(data).map(([key, value]) => ({
            name: key,
            type: inferType(value),
            required: true,
            enumValues: '',
            arrayItemType: Array.isArray(value) ? inferArrayItemType(value) : 'string',
          })) as DetectedOutputProp[]
        );
      } else {
        onFieldsChange(
          Object.entries(data).map(([key, value]) => ({
            name: key,
            type: inferType(value),
            required: true,
          })) as DetectedField[]
        );
      }
    } catch {
      onParseErrorChange('Invalid JSON — check your syntax.');
    }
  };

  const toggleRequired = (name: string) => {
    onFieldsChange(
      (fields as Array<DetectedField | DetectedOutputProp>).map((f) =>
        f.name === name ? { ...f, required: !f.required } : f
      ) as DetectedField[] | DetectedOutputProp[]
    );
  };

  const removeField = (name: string) => {
    onFieldsChange(
      (fields as Array<DetectedField | DetectedOutputProp>).filter(
        (f) => f.name !== name
      ) as DetectedField[] | DetectedOutputProp[]
    );
  };

  const updateOutputProp = (
    name: string,
    key: 'enumValues' | 'arrayItemType',
    value: string
  ) => {
    onFieldsChange(
      (fields as DetectedOutputProp[]).map((f) =>
        f.name === name ? { ...f, [key]: value } : f
      )
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* Left: paste area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {showEnumAndArray && onSchemaTitleChange && (
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>
              SCHEMA TITLE <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              className="input-field"
              value={schemaTitle}
              onChange={(e) => onSchemaTitleChange(e.target.value)}
              placeholder="MyResult"
              style={{ fontSize: 13 }}
            />
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>
            {label}
          </label>
          <textarea
            className="input-field"
            value={jsonText}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%',
              minHeight: showEnumAndArray ? 260 : 200,
              resize: 'vertical',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              lineHeight: 1.8,
            }}
          />
        </div>

        {parseError && (
          <div style={{ padding: '8px 12px', background: 'var(--red-muted)', border: '1px solid rgba(255,68,68,0.3)', color: 'var(--red)', fontSize: 12 }}>
            ⚠ {parseError}
          </div>
        )}

        {!parseError && fields.length === 0 && jsonText.trim() === '' && (
          <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Paste new JSON to override, or leave blank to keep existing.
          </div>
        )}
      </div>

      {/* Right: detected keys */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 8 }}>
          {fields.length > 0 && jsonText.trim() ? 'DETECTED KEYS' : 'CURRENT KEYS'}
          {fields.length > 0 && (
            <span style={{ padding: '1px 6px', background: 'var(--accent-muted)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontSize: 10 }}>
              {fields.length}
            </span>
          )}
        </div>

        {fields.length === 0 ? (
          <div style={{ border: '1px dashed var(--border)', padding: '40px 24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {jsonText.trim() ? 'No valid keys found' : 'Keys appear here as you type'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 400 }}>
            {(fields as Array<DetectedField | DetectedOutputProp>).map((field) => (
              <div key={field.name} className="panel-elevated" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {field.name}
                    </span>
                    <span style={{ fontSize: 10, padding: '1px 7px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-dim)', flexShrink: 0, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {field.type}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: field.required ? 'var(--accent)' : 'var(--text-dim)', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>
                      <input type="checkbox" checked={field.required} onChange={() => toggleRequired(field.name)} style={{ accentColor: 'var(--accent)' }} />
                      req
                    </label>
                    <button onClick={() => removeField(field.name)} className="btn-danger" style={{ fontSize: 11, padding: '4px 7px' }} title="Remove field">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>

                {showEnumAndArray && (
                  <>
                    {field.type === 'string' && (
                      <div style={{ marginTop: 10 }}>
                        <label style={{ display: 'block', fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>
                          ENUM VALUES <span style={{ fontWeight: 400 }}>(comma-separated, optional)</span>
                        </label>
                        <input
                          className="input-field"
                          value={(field as DetectedOutputProp).enumValues}
                          onChange={(e) => updateOutputProp(field.name, 'enumValues', e.target.value)}
                          placeholder="positive, negative, neutral"
                          style={{ fontSize: 11 }}
                        />
                      </div>
                    )}
                    {field.type === 'array' && (
                      <div style={{ marginTop: 10 }}>
                        <label style={{ display: 'block', fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>
                          ARRAY ITEM TYPE
                        </label>
                        <select
                          className="input-field"
                          value={(field as DetectedOutputProp).arrayItemType}
                          onChange={(e) => updateOutputProp(field.name, 'arrayItemType', e.target.value)}
                          style={{ fontSize: 11 }}
                        >
                          <option value="string">string</option>
                          <option value="number">number</option>
                          <option value="boolean">boolean</option>
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Edit Page ─────────────────────────────────────────────────────────────
export default function EditAPIPage() {
  const params = useParams<{ username: string; endpoint: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [fetchError, setFetchError] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Step state
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [description, setDescription] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

  // Step 2 — inputs
  const [inputJson, setInputJson] = useState('');
  const [inputFields, setInputFields] = useState<DetectedField[]>([]);
  const [inputParseError, setInputParseError] = useState('');

  // Step 3 — output schema
  const [outputJson, setOutputJson] = useState('');
  const [outputProps, setOutputProps] = useState<DetectedOutputProp[]>([]);
  const [outputParseError, setOutputParseError] = useState('');
  const [schemaTitle, setSchemaTitle] = useState('MyResult');

  // Step 4
  const [aiPrompt, setAiPrompt] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  // ── Load existing endpoint ─────────────────────────────────────────────────
  useEffect(() => {
    if (!params?.username || !params?.endpoint) return;

    fetch(`${BASE_URL}/list?username=${params.username}`)
      .then((r) => r.json())
      .then((list: Array<{
        endpoint_name: string;
        input_fields: string[];
        output_schema: Record<string, unknown>;
        description?: string;
        created_at: string;
      }>) => {
        const found = list.find((ep) => ep.endpoint_name === params.endpoint);
        if (!found) {
          setFetchError(`Endpoint /${params.username}/${params.endpoint} not found.`);
          return;
        }

        setDescription(found.description || '');

        // Pre-populate input fields from the string[] the list returns
        setInputFields(
          found.input_fields.map((name) => ({
            name,
            type: 'string',
            required: true,
          }))
        );

        // Pre-populate output schema
        const title = (found.output_schema.title as string) || 'MyResult';
        setSchemaTitle(title);
        setOutputProps(schemaToOutputProps(found.output_schema));

        setLoaded(true);
      })
      .catch(() => setFetchError('Failed to load endpoint data.'));
  }, [params?.username, params?.endpoint]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setSaveError('');

    try {
      const patch: Record<string, unknown> = {
        description,
        input_fields: inputFields.map((f) => ({
          name: f.name,
          label: f.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          type: f.type,
          required: f.required,
          description: '',
        })),
        output_schema: buildJsonSchema(schemaTitle, outputProps),
      };
      if (aiPrompt.trim()) patch.ai_prompt = aiPrompt.trim();
      if (geminiKey.trim()) patch.gemini_api_key = geminiKey.trim();

      const res = await fetch(`${BASE_URL}/${params.username}/${params.endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || `HTTP ${res.status}`);
      }

      setSaved(true);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const STEPS = [
    { n: 1, label: 'Basics' },
    { n: 2, label: 'Input Fields' },
    { n: 3, label: 'Output Schema' },
    { n: 4, label: 'AI Prompt' },
  ];

  // ── Loading / error ────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div style={{ padding: '80px 48px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>⚠</div>
        <p style={{ color: 'var(--red)', marginBottom: 24, fontSize: 14 }}>{fetchError}</p>
        <button className="btn-ghost" onClick={() => router.push('/dashboard/view-apis')}>
          ← Back to APIs
        </button>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div style={{ padding: '80px 48px', textAlign: 'center', color: 'var(--text-dim)' }}>
        <span className="cursor-blink">_</span> Loading endpoint...
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (saved) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24, padding: 40 }}>
        <div style={{ textAlign: 'center' }} className="fade-up fade-up-1">
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Changes saved!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif" }}>
            /{params.username}/{params.endpoint} has been updated.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }} className="fade-up fade-up-2">
          <button className="btn-ghost" onClick={() => { setSaved(false); setStep(1); }}>
            Continue Editing
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              const urlParams = new URLSearchParams({
                username: params.username,
                endpoint: params.endpoint,
                input_fields: JSON.stringify(inputFields.map((f) => f.name)),
              });
              router.push(`/dashboard/test-api?${urlParams.toString()}`);
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="5,3 19,12 5,21 5,3" />
            </svg>
            Test API
          </button>
          <button className="btn-primary" onClick={() => router.push('/dashboard/view-apis')}>
            → View All APIs
          </button>
        </div>
      </div>
    );
  }

  // ── Main edit form ─────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '32px 48px', maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button className="btn-ghost" onClick={() => router.push('/dashboard/view-apis')} style={{ fontSize: 11, padding: '5px 10px' }}>
            ← Back
          </button>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.12em' }}>EDIT ENDPOINT</div>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>
          /{params.username}/{params.endpoint}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4, fontFamily: "'IBM Plex Sans', sans-serif" }}>
          Current values are pre-loaded. Paste new JSON to override inputs or output schema.
        </p>
      </div>

      {/* Step tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 40 }}>
        {STEPS.map(({ n, label }) => (
          <button
            key={n}
            onClick={() => setStep(n as Step)}
            style={{
              padding: '10px 24px',
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
              width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
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

      {/* ── Step 1: Basics ── */}
      {step === 1 && (
        <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, alignItems: 'start' }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>ENDPOINT</label>
            <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-dim)', fontFamily: "'IBM Plex Mono', monospace" }}>
              /{params.username}/{params.endpoint}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 5 }}>Endpoint name cannot be changed.</p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>DESCRIPTION</label>
            <input
              className="input-field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this endpoint do?"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>
              GEMINI API KEY <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(blank = keep existing)</span>
            </label>
            <input className="input-field" type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="AIza..." />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
            <button className="btn-primary" onClick={() => setStep(2)}>
              Next: Input Fields →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Input Fields ── */}
      {step === 2 && (
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Current input fields are pre-loaded below. Paste a new sample JSON to replace them, or edit the detected keys directly.
          </p>

          <JsonKeyDetector
            label="PASTE NEW SAMPLE INPUT JSON (optional)"
            placeholder={`{\n  "text": "I love this product!",\n  "language": "en"\n}`}
            fields={inputFields}
            onFieldsChange={(f) => setInputFields(f as DetectedField[])}
            jsonText={inputJson}
            onJsonTextChange={setInputJson}
            parseError={inputParseError}
            onParseErrorChange={setInputParseError}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8 }}>
            <button className="btn-ghost" onClick={() => setStep(1)} style={{ fontSize: 12 }}>← Back</button>
            <button
              className="btn-primary"
              onClick={() => setStep(3)}
              disabled={inputFields.length === 0 || !!inputParseError}
              style={{ opacity: inputFields.length > 0 && !inputParseError ? 1 : 0.4 }}
            >
              Next: Output Schema →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Output Schema ── */}
      {step === 3 && (
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Current output schema is pre-loaded below. Paste a new sample JSON to replace it, or edit the detected keys directly.
          </p>

          <JsonKeyDetector
            label="PASTE NEW SAMPLE OUTPUT JSON (optional)"
            placeholder={`{\n  "sentiment": "positive",\n  "confidence": 0.97,\n  "key_points": []\n}`}
            fields={outputProps}
            onFieldsChange={(f) => setOutputProps(f as DetectedOutputProp[])}
            jsonText={outputJson}
            onJsonTextChange={setOutputJson}
            parseError={outputParseError}
            onParseErrorChange={setOutputParseError}
            showEnumAndArray
            schemaTitle={schemaTitle}
            onSchemaTitleChange={setSchemaTitle}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8 }}>
            <button className="btn-ghost" onClick={() => setStep(2)} style={{ fontSize: 12 }}>← Back</button>
            <button
              className="btn-primary"
              onClick={() => setStep(4)}
              disabled={outputProps.length === 0 || !!outputParseError}
              style={{ opacity: outputProps.length > 0 && !outputParseError ? 1 : 0.4 }}
            >
              Next: AI Prompt →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: AI Prompt + Save ── */}
      {step === 4 && (
        <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>
                AI SYSTEM PROMPT <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(blank = keep existing)</span>
              </label>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: "'IBM Plex Sans', sans-serif", marginBottom: 10 }}>
                Leave empty to keep the current prompt. Fill in to replace it entirely.
              </p>
              <textarea
                className="input-field"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="You are a sentiment analyzer. Given the input text, determine its emotional tone and return the result as specified."
                style={{ width: '100%', minHeight: 200, resize: 'vertical', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, lineHeight: 1.7 }}
              />
            </div>

            {saveError && (
              <div style={{ padding: '10px 14px', background: 'var(--red-muted)', border: '1px solid rgba(255,68,68,0.3)', color: 'var(--red)', fontSize: 12 }}>
                ⚠ {saveError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4 }}>
              <button className="btn-ghost" onClick={() => setStep(3)} style={{ fontSize: 12 }}>← Back</button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
                style={{ opacity: saving ? 0.6 : 1, padding: '12px 28px', fontSize: 14 }}
              >
                {saving ? <><span className="cursor-blink">_</span> Saving...</> : <>✓ Save Changes</>}
              </button>
            </div>
          </div>

          {/* Right: patch summary */}
          <div className="panel-elevated" style={{ padding: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 18 }}>PATCH SUMMARY</div>
            <div style={{ display: 'grid', gap: 14 }}>
              {[
                { label: 'ENDPOINT', value: `/${params.username}/${params.endpoint}`, dim: false },
                { label: 'DESCRIPTION', value: description || '(unchanged)', dim: !description },
                { label: 'INPUTS', value: inputFields.map((f) => `${f.name}(${f.type})`).join(', ') || '—', dim: false },
                { label: 'SCHEMA', value: schemaTitle, dim: false },
                { label: 'OUTPUTS', value: outputProps.map((p) => `${p.name}(${p.type})`).join(', ') || '—', dim: false },
                { label: 'AI PROMPT', value: aiPrompt.trim() ? 'Will be replaced' : '(unchanged)', dim: !aiPrompt.trim() },
                { label: 'API KEY', value: geminiKey.trim() ? 'Will be updated' : '(unchanged)', dim: !geminiKey.trim() },
              ].map(({ label, value, dim }) => (
                <div key={label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', minWidth: 80, paddingTop: 2 }}>{label}</span>
                  <span style={{ fontSize: 12, color: dim ? 'var(--text-dim)' : 'var(--accent)', lineHeight: 1.6, wordBreak: 'break-word' }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 8 }}>OUTPUT SCHEMA</div>
              <pre style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '10px 12px', fontSize: 11, color: 'var(--accent)', overflow: 'auto', maxHeight: 180, lineHeight: 1.7, fontFamily: "'IBM Plex Mono', monospace" }}>
                {JSON.stringify(buildJsonSchema(schemaTitle, outputProps), null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}