'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerEndpoint } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

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

function jsonToInputFields(json: Record<string, unknown>): DetectedField[] {
  return Object.entries(json).map(([key, value]) => ({
    name: key,
    type: inferType(value),
    required: true,
  }));
}

function jsonToOutputProps(json: Record<string, unknown>): DetectedOutputProp[] {
  return Object.entries(json).map(([key, value]) => ({
    name: key,
    type: inferType(value),
    required: true,
    enumValues: '',
    arrayItemType: Array.isArray(value) ? inferArrayItemType(value) : 'string',
  }));
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
      onFieldsChange([]);
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
        onFieldsChange(jsonToOutputProps(data) as DetectedOutputProp[]);
      } else {
        onFieldsChange(jsonToInputFields(data) as DetectedField[]);
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
            <label
              style={{
                display: 'block',
                fontSize: 11,
                color: 'var(--text-dim)',
                letterSpacing: '0.1em',
                marginBottom: 6,
              }}
            >
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
          <label
            style={{
              display: 'block',
              fontSize: 11,
              color: 'var(--text-dim)',
              letterSpacing: '0.1em',
              marginBottom: 6,
            }}
          >
            {label}
          </label>
          <textarea
            className="input-field"
            value={jsonText}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%',
              minHeight: showEnumAndArray ? 280 : 220,
              resize: 'vertical',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              lineHeight: 1.8,
            }}
          />
        </div>

        {parseError && (
          <div
            style={{
              padding: '8px 12px',
              background: 'var(--red-muted)',
              border: '1px solid rgba(255,68,68,0.3)',
              color: 'var(--red)',
              fontSize: 12,
            }}
          >
            ⚠ {parseError}
          </div>
        )}

        {!parseError && fields.length === 0 && jsonText.trim() === '' && (
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              fontSize: 11,
              color: 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Paste a JSON sample above — keys are detected automatically.
          </div>
        )}
      </div>

      {/* Right: detected keys */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-dim)',
            letterSpacing: '0.1em',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          DETECTED KEYS
          {fields.length > 0 && (
            <span
              style={{
                padding: '1px 6px',
                background: 'var(--accent-muted)',
                border: '1px solid var(--accent-border)',
                color: 'var(--accent)',
                fontSize: 10,
              }}
            >
              {fields.length}
            </span>
          )}
        </div>

        {fields.length === 0 ? (
          <div
            style={{
              border: '1px dashed var(--border)',
              padding: '40px 24px',
              textAlign: 'center',
              color: 'var(--text-dim)',
              fontSize: 12,
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Keys appear here as you type
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              overflowY: 'auto',
              maxHeight: 420,
            }}
          >
            {(fields as Array<DetectedField | DetectedOutputProp>).map((field) => (
              <div
                key={field.name}
                className="panel-elevated"
                style={{ padding: '12px 14px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    {/* Key name */}
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: "'IBM Plex Mono', monospace",
                        color: 'var(--accent)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {field.name}
                    </span>

                    {/* Type badge */}
                    <span
                      style={{
                        fontSize: 10,
                        padding: '1px 7px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-dim)',
                        flexShrink: 0,
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}
                    >
                      {field.type}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {/* Required toggle */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11,
                        color: field.required ? 'var(--accent)' : 'var(--text-dim)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={() => toggleRequired(field.name)}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      req
                    </label>

                    {/* Remove */}
                    <button
                      onClick={() => removeField(field.name)}
                      className="btn-danger"
                      style={{ fontSize: 11, padding: '4px 7px' }}
                      title="Remove field"
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Extra options for output props */}
                {showEnumAndArray && (
                  <>
                    {field.type === 'string' && (
                      <div style={{ marginTop: 10 }}>
                        <label
                          style={{
                            display: 'block',
                            fontSize: 10,
                            color: 'var(--text-dim)',
                            marginBottom: 4,
                          }}
                        >
                          ENUM VALUES{' '}
                          <span style={{ fontWeight: 400 }}>(comma-separated, optional)</span>
                        </label>
                        <input
                          className="input-field"
                          value={(field as DetectedOutputProp).enumValues}
                          onChange={(e) =>
                            updateOutputProp(field.name, 'enumValues', e.target.value)
                          }
                          placeholder="positive, negative, neutral"
                          style={{ fontSize: 11 }}
                        />
                      </div>
                    )}
                    {field.type === 'array' && (
                      <div style={{ marginTop: 10 }}>
                        <label
                          style={{
                            display: 'block',
                            fontSize: 10,
                            color: 'var(--text-dim)',
                            marginBottom: 4,
                          }}
                        >
                          ARRAY ITEM TYPE
                        </label>
                        <select
                          className="input-field"
                          value={(field as DetectedOutputProp).arrayItemType}
                          onChange={(e) =>
                            updateOutputProp(
                              field.name,
                              'arrayItemType',
                              e.target.value
                            )
                          }
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

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function APIBuilder() {
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [endpointName, setEndpointName] = useState('');
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { username } = useAuth();
  const router = useRouter();

  const handleBuild = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        endpoint_name: endpointName.trim().toLowerCase().replace(/\s+/g, '_'),
        username: username!,
        input_fields: inputFields.map((f) => ({
          name: f.name,
          label: f.name
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          type: f.type,
          required: f.required,
          description: '',
        })),
        output_schema: buildJsonSchema(schemaTitle, outputProps),
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

  const resetAll = () => {
    setSuccess(false);
    setStep(1);
    setEndpointName('');
    setDescription('');
    setAiPrompt('');
    setInputJson('');
    setInputFields([]);
    setInputParseError('');
    setOutputJson('');
    setOutputProps([]);
    setOutputParseError('');
    setSchemaTitle('MyResult');
  };

  const STEPS = [
    { n: 1, label: 'Basics' },
    { n: 2, label: 'Inputs' },
    { n: 3, label: 'Output Schema' },
    { n: 4, label: 'AI Prompt' },
  ];

  // ── Success ────────────────────────────────────────────────────────────────
  if (success) {
    const name = endpointName.trim().toLowerCase().replace(/\s+/g, '_');
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <div style={{ textAlign: 'center' }} className="fade-up fade-up-1">
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            Endpoint deployed!
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            Your API is live at:
          </p>
        </div>
        <div
          className="panel fade-up fade-up-2"
          style={{ padding: '16px 24px', maxWidth: 560, width: '100%' }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>
            POST
          </div>
          <div style={{ fontSize: 13, color: 'var(--accent)' }}>
            {`${
              typeof window !== 'undefined'
                ? 'https://ai-machapi.vercel.app'
                : 'https://ai-machapi.vercel.app'
            }/${username}/${name}`}
          </div>
        </div>
        <div className="fade-up fade-up-3" style={{ display: 'flex', gap: 12 }}>
          <button className="btn-ghost" onClick={resetAll}>
            Build Another
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              const params = new URLSearchParams({
                username: username!,
                endpoint: name,
                input_fields: JSON.stringify(inputFields.map((f) => f.name)),
              });
              router.push(`/dashboard/test-api?${params.toString()}`);
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="5,3 19,12 5,21 5,3"/>
            </svg>
            Test API
          </button>
          <button
            className="btn-primary"
            onClick={() => router.push('/dashboard/view-apis')}
          >
            → View All APIs
          </button>
        </div>
      </div>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '32px 48px', maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-dim)',
            letterSpacing: '0.12em',
            marginBottom: 6,
          }}
        >
          BUILD
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em' }}>
          API Builder
        </h1>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: 13,
            marginTop: 4,
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}
        >
          Define your endpoint, paste sample JSON for inputs and outputs, then write your AI prompt.
        </p>
      </div>

      {/* Step tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          marginBottom: 40,
        }}
      >
        {STEPS.map(({ n, label }) => (
          <button
            key={n}
            onClick={() => setStep(n as Step)}
            style={{
              padding: '10px 24px',
              background: 'transparent',
              border: 'none',
              borderBottom:
                step === n ? '2px solid var(--accent)' : '2px solid transparent',
              color:
                step === n
                  ? 'var(--accent)'
                  : step > n
                  ? 'var(--text-secondary)'
                  : 'var(--text-dim)',
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
            <span
              style={{
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                background:
                  step === n
                    ? 'var(--accent-muted)'
                    : step > n
                    ? 'rgba(0,255,136,0.1)'
                    : 'var(--bg-elevated)',
                border: `1px solid ${
                  step === n ? 'var(--accent-border)' : 'var(--border)'
                }`,
                color:
                  step > n || step === n ? 'var(--accent)' : 'var(--text-dim)',
              }}
            >
              {step > n ? '✓' : n}
            </span>
            {label}
          </button>
        ))}
      </div>

      {/* ── Step 1: Basics ── */}
      {step === 1 && (
        <div
          className="fade-up"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 24,
            alignItems: 'start',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                color: 'var(--text-dim)',
                letterSpacing: '0.1em',
                marginBottom: 6,
              }}
            >
              ENDPOINT NAME <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  padding: '10px 12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRight: 'none',
                  color: 'var(--text-dim)',
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                /{username}/
              </span>
              <input
                className="input-field"
                value={endpointName}
                onChange={(e) => setEndpointName(e.target.value)}
                placeholder="sentiment-analyzer"
                style={{ flex: 1 }}
              />
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 6 }}>
              Alphanumeric, hyphens, underscores only.
            </p>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                color: 'var(--text-dim)',
                letterSpacing: '0.1em',
                marginBottom: 6,
              }}
            >
              DESCRIPTION
            </label>
            <input
              className="input-field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Analyzes the sentiment of a given text"
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                color: 'var(--text-dim)',
                letterSpacing: '0.1em',
                marginBottom: 6,
              }}
            >
              GEMINI API KEY{' '}
              <span style={{ color: 'var(--text-dim)' }}>(uses stored key if blank)</span>
            </label>
            <input
              className="input-field"
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIza..."
            />
          </div>

          <div
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              justifyContent: 'flex-end',
              paddingTop: 8,
            }}
          >
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

      {/* ── Step 2: Inputs via JSON paste ── */}
      {step === 2 && (
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            Paste a sample input JSON. Keys are detected automatically — toggle required and remove unwanted fields.
          </p>

          <JsonKeyDetector
            label="SAMPLE INPUT JSON"
            placeholder={`{\n  "text": "I love this product!",\n  "language": "en"\n}`}
            fields={inputFields}
            onFieldsChange={(f) => setInputFields(f as DetectedField[])}
            jsonText={inputJson}
            onJsonTextChange={setInputJson}
            parseError={inputParseError}
            onParseErrorChange={setInputParseError}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 8,
            }}
          >
            <button
              className="btn-ghost"
              onClick={() => setStep(1)}
              style={{ fontSize: 12 }}
            >
              ← Back
            </button>
            <button
              className="btn-primary"
              onClick={() => setStep(3)}
              disabled={inputFields.length === 0 || !!inputParseError}
              style={{
                opacity:
                  inputFields.length > 0 && !inputParseError ? 1 : 0.4,
              }}
            >
              Next: Output Schema →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Output Schema via JSON paste ── */}
      {step === 3 && (
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            Paste a sample output JSON. Keys are detected automatically — set enum values, array item types, and required.
          </p>

          <JsonKeyDetector
            label="SAMPLE OUTPUT JSON"
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

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 8,
            }}
          >
            <button
              className="btn-ghost"
              onClick={() => setStep(2)}
              style={{ fontSize: 12 }}
            >
              ← Back
            </button>
            <button
              className="btn-primary"
              onClick={() => setStep(4)}
              disabled={outputProps.length === 0 || !!outputParseError}
              style={{
                opacity:
                  outputProps.length > 0 && !outputParseError ? 1 : 0.4,
              }}
            >
              Next: AI Prompt →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: AI Prompt + Build ── */}
      {step === 4 && (
        <div
          className="fade-up"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 32,
            alignItems: 'start',
          }}
        >
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  color: 'var(--text-dim)',
                  letterSpacing: '0.1em',
                  marginBottom: 6,
                }}
              >
                AI SYSTEM PROMPT <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  marginBottom: 10,
                }}
              >
                Tell the AI what to do. Input field values will be injected automatically.
              </p>
              <textarea
                className="input-field"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={`You are a sentiment analyzer. Given the input text, determine its emotional tone and return the result as specified.`}
                style={{
                  width: '100%',
                  minHeight: 220,
                  resize: 'vertical',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'var(--red-muted)',
                  border: '1px solid rgba(255,68,68,0.3)',
                  color: 'var(--red)',
                  fontSize: 12,
                }}
              >
                ⚠ {error}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 4,
              }}
            >
              <button
                className="btn-ghost"
                onClick={() => setStep(3)}
                style={{ fontSize: 12 }}
              >
                ← Back
              </button>
              <button
                className="btn-primary"
                onClick={handleBuild}
                disabled={loading || !aiPrompt.trim()}
                style={{
                  opacity: !aiPrompt.trim() || loading ? 0.5 : 1,
                  padding: '12px 28px',
                  fontSize: 14,
                }}
              >
                {loading ? (
                  <>
                    <span className="cursor-blink">_</span> Building...
                  </>
                ) : (
                  <>⚡ Deploy Endpoint</>
                )}
              </button>
            </div>
          </div>

          {/* Right: build summary */}
          <div className="panel-elevated" style={{ padding: 24 }}>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-dim)',
                letterSpacing: '0.1em',
                marginBottom: 18,
              }}
            >
              BUILD SUMMARY
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              {[
                {
                  label: 'ENDPOINT',
                  value: `/${username}/${endpointName
                    .toLowerCase()
                    .replace(/\s+/g, '_')}`,
                },
                {
                  label: 'INPUTS',
                  value:
                    inputFields.map((f) => `${f.name}(${f.type})`).join(', ') ||
                    '—',
                },
                {
                  label: 'SCHEMA',
                  value: schemaTitle || 'MyResult',
                },
                {
                  label: 'OUTPUTS',
                  value:
                    outputProps
                      .map((p) => `${p.name}(${p.type})`)
                      .join(', ') || '—',
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--text-dim)',
                      letterSpacing: '0.1em',
                      minWidth: 80,
                      paddingTop: 2,
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--accent)',
                      lineHeight: 1.6,
                      wordBreak: 'break-word',
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--text-dim)',
                  letterSpacing: '0.1em',
                  marginBottom: 8,
                }}
              >
                OUTPUT SCHEMA
              </div>
              <pre
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  padding: '10px 12px',
                  fontSize: 11,
                  color: 'var(--accent)',
                  overflow: 'auto',
                  maxHeight: 200,
                  lineHeight: 1.7,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {JSON.stringify(buildJsonSchema(schemaTitle, outputProps), null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}