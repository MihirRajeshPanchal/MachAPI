'use client';
import { useRef, useState } from 'react';
import {
  SchemaProperty,
  SCHEMA_TYPES,
  uid,
  buildJsonSchema,
  sampleResponseToProps,
  sampleJsonToInputFields,
  InputField,
} from '../lib/schemaUtils';

// ── Schema Builder ─────────────────────────────────────────────────────────────
interface SchemaBuilderProps {
  title: string;
  onTitleChange: (t: string) => void;
  properties: SchemaProperty[];
  onPropertiesChange: (ps: SchemaProperty[]) => void;
}

const PRESETS = [
  {
    label: 'Sentiment',
    title: 'SentimentResult',
    props: (): SchemaProperty[] => [
      { id: uid(), name: 'sentiment', type: 'string', description: '', required: true, enumValues: 'positive,negative,neutral', arrayItemType: 'string' },
      { id: uid(), name: 'confidence', type: 'number', description: '', required: true, enumValues: '', arrayItemType: 'string' },
    ],
  },
  {
    label: 'Summary',
    title: 'SummaryResult',
    props: (): SchemaProperty[] => [
      { id: uid(), name: 'summary', type: 'string', description: '', required: true, enumValues: '', arrayItemType: 'string' },
      { id: uid(), name: 'key_points', type: 'array', description: '', required: true, enumValues: '', arrayItemType: 'string' },
    ],
  },
  {
    label: 'Classification',
    title: 'ClassificationResult',
    props: (): SchemaProperty[] => [
      { id: uid(), name: 'category', type: 'string', description: '', required: true, enumValues: '', arrayItemType: 'string' },
      { id: uid(), name: 'score', type: 'number', description: '', required: true, enumValues: '', arrayItemType: 'string' },
      { id: uid(), name: 'reasoning', type: 'string', description: '', required: false, enumValues: '', arrayItemType: 'string' },
    ],
  },
];

export function SchemaBuilder({
  title,
  onTitleChange,
  properties,
  onPropertiesChange,
}: SchemaBuilderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'json' | 'form'>('json');
  const [jsonText, setJsonText] = useState('');

  const addProp = () => {
    onPropertiesChange([
      ...properties,
      { id: uid(), name: '', type: 'string', description: '', required: true, enumValues: '', arrayItemType: 'string' },
    ]);
  };

  const removeProp = (id: string) => {
    onPropertiesChange(properties.filter((p) => p.id !== id));
  };

  const updateProp = (id: string, key: keyof SchemaProperty, value: string | boolean) => {
    onPropertiesChange(properties.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  };

  const handleSampleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          const derived = sampleResponseToProps(parsed);
          onPropertiesChange(derived);
          if (!title || title === 'MyResult') onTitleChange('DerivedResult');
          setMode('form');
        }
      } catch {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleJsonPaste = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        const derived = sampleResponseToProps(parsed);
        onPropertiesChange(derived);
        if (parsed.title && typeof parsed.title === 'string') {
          onTitleChange(parsed.title);
        } else if (!title || title === 'MyResult') {
          onTitleChange('DerivedResult');
        }
      }
    } catch {
      alert('Invalid JSON format');
    }
  };

  const preview = JSON.stringify(buildJsonSchema(title, properties), null, 2);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* Left: Builder UI */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Title */}
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>
            SCHEMA TITLE <span style={{ color: 'var(--red)' }}>*</span>
          </label>
          <input
            className="input-field"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="SentimentResult"
            style={{ fontSize: 13 }}
          />
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border)' }}>
            {(['json', 'form'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '6px 16px',
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
                {m === 'json' ? 'JSON PASTE' : 'FORM'}
              </button>
            ))}
          </div>
        </div>

        {mode === 'json' ? (
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Paste your output schema JSON
            </label>
            <textarea
              className="input-field"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={`{\n  "sentiment": "positive",\n  "confidence": 0.95\n}`}
              style={{
                width: '100%',
                minHeight: 200,
                resize: 'vertical',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                lineHeight: 1.7,
              }}
            />
            <button
              className="btn-primary"
              onClick={handleJsonPaste}
              style={{ width: '100%', justifyContent: 'center', marginTop: 10, fontSize: 12 }}
            >
              Parse & Generate Schema
            </button>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>PRESETS:</span>
                {PRESETS.map((t) => (
                  <button
                    key={t.label}
                    className="btn-ghost"
                    style={{ fontSize: 10, padding: '3px 10px' }}
                    onClick={() => {
                      onTitleChange(t.title);
                      onPropertiesChange(t.props());
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {/* Upload sample response JSON */}
                <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleSampleUpload} />
                <button
                  className="btn-ghost"
                  style={{ fontSize: 10, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
                  onClick={() => fileRef.current?.click()}
                  title="Upload a sample response JSON to auto-generate the schema"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17,8 12,3 7,8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Sample JSON
                </button>
                <button className="btn-ghost" onClick={addProp} style={{ fontSize: 10, padding: '4px 10px' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Property
                </button>
              </div>
            </div>

            {/* Note: no nested schema */}
            <div style={{
              padding: '8px 12px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              fontSize: 11,
              color: 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Nested object schemas are not supported in the UI builder.
            </div>

            {properties.length === 0 && (
              <div style={{ border: '1px dashed var(--border)', padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
                No properties yet. Add one, pick a preset, or use JSON paste mode.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 420 }}>
              {properties.map((prop, i) => (
                <div key={prop.id} className="panel-elevated" style={{ padding: '14px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, color: 'var(--text-dim)', background: 'var(--bg-panel)', padding: '1px 7px', border: '1px solid var(--border)' }}>
                    PROP {i + 1}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', marginBottom: 4 }}>
                        NAME *
                      </label>
                      <input className="input-field" value={prop.name} onChange={(e) => updateProp(prop.id, 'name', e.target.value)} placeholder="field_name" style={{ fontSize: 12 }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', marginBottom: 4 }}>
                        TYPE
                      </label>
                      <select className="input-field" value={prop.type} onChange={(e) => updateProp(prop.id, 'type', e.target.value)} style={{ fontSize: 12, cursor: 'pointer' }}>
                        {SCHEMA_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', marginBottom: 4 }}>
                        DESCRIPTION
                      </label>
                      <input className="input-field" value={prop.description} onChange={(e) => updateProp(prop.id, 'description', e.target.value)} placeholder="Optional" style={{ fontSize: 12 }} />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap', paddingBottom: 1 }}>
                      <input type="checkbox" checked={prop.required} onChange={(e) => updateProp(prop.id, 'required', e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                      Req
                    </label>
                    <button onClick={() => removeProp(prop.id)} className="btn-danger" style={{ fontSize: 11, padding: '6px 8px' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>

                  {prop.type === 'string' && (
                    <div style={{ marginTop: 10 }}>
                      <label style={{ display: 'block', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', marginBottom: 4 }}>
                        ENUM VALUES <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(comma-separated, optional)</span>
                      </label>
                      <input className="input-field" value={prop.enumValues} onChange={(e) => updateProp(prop.id, 'enumValues', e.target.value)} placeholder="positive, negative, neutral" style={{ fontSize: 12 }} />
                    </div>
                  )}

                  {prop.type === 'array' && (
                    <div style={{ marginTop: 10 }}>
                      <label style={{ display: 'block', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', marginBottom: 4 }}>
                        ARRAY ITEM TYPE
                      </label>
                      <select className="input-field" value={prop.arrayItemType} onChange={(e) => updateProp(prop.id, 'arrayItemType', e.target.value as 'string' | 'number' | 'boolean')} style={{ fontSize: 12, cursor: 'pointer' }}>
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                      </select>
                    </div>
                  )}

                  {prop.type === 'object' && (
                    <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-dim)' }}>
                      ⚠ Nested objects: edit the JSON preview directly after saving.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Right: live JSON preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 8 }}>
          JSON SCHEMA PREVIEW
          <span style={{ padding: '1px 6px', background: 'var(--accent-muted)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontSize: 10 }}>
            LIVE
          </span>
        </div>
        <pre
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            padding: '16px',
            fontSize: 12,
            color: 'var(--accent)',
            overflow: 'auto',
            flex: 1,
            lineHeight: 1.8,
            fontFamily: "'IBM Plex Mono', monospace",
            minHeight: 300,
          }}
        >
          {preview}
        </pre>
      </div>
    </div>
  );
}

// ── Input Fields section with JSON paste toggle ────────────────────────────────
interface InputFieldsEditorProps {
  fields: InputField[];
  onChange: (fields: InputField[]) => void;
}

export function InputFieldsEditor({ fields, onChange }: InputFieldsEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'json' | 'form'>('json');
  const [jsonText, setJsonText] = useState('');
  const FIELD_TYPES = ['string', 'number', 'boolean', 'array', 'object'];

  const addField = () => onChange([...fields, { name: '', label: '', type: 'string', required: true, description: '' }]);
  const removeField = (i: number) => onChange(fields.filter((_, idx) => idx !== i));
  const updateField = (i: number, key: keyof InputField, value: string | boolean) => {
    const updated = [...fields];
    updated[i] = { ...updated[i], [key]: value } as InputField;
    onChange(updated);
  };

  const handleSampleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        // Accept { "inputs": {...} } or the raw object
        const data = parsed.inputs && typeof parsed.inputs === 'object' ? parsed.inputs : parsed;
        if (typeof data === 'object' && !Array.isArray(data)) {
          onChange(sampleJsonToInputFields(data));
          setMode('form');
        }
      } catch {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleJsonPaste = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const data = parsed.inputs && typeof parsed.inputs === 'object' ? parsed.inputs : parsed;
      if (typeof data === 'object' && !Array.isArray(data)) {
        onChange(sampleJsonToInputFields(data));
      }
    } catch {
      alert('Invalid JSON format');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif" }}>
          Define the inputs your endpoint will accept.
        </p>

        {/* Mode toggle */}
        <div style={{ display: 'flex', border: '1px solid var(--border)' }}>
          {(['json', 'form'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '6px 16px',
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
              {m === 'json' ? 'JSON PASTE' : 'FORM'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'json' ? (
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Paste your input fields JSON
          </label>
          <textarea
            className="input-field"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={`{\n  "text": "Sample text",\n  "language": "en"\n}`}
            style={{
              width: '100%',
              minHeight: 160,
              resize: 'vertical',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              lineHeight: 1.7,
            }}
          />
          <button
            className="btn-primary"
            onClick={handleJsonPaste}
            style={{ width: '100%', justifyContent: 'center', marginTop: 10, fontSize: 12 }}
          >
            Parse & Generate Input Fields
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleSampleUpload} />
            <button
              className="btn-ghost"
              onClick={() => fileRef.current?.click()}
              style={{ fontSize: 11, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5 }}
              title="Upload a sample input JSON to auto-generate input fields"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17,8 12,3 7,8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload Sample Input JSON
            </button>
            <button className="btn-ghost" onClick={addField} style={{ fontSize: 12, padding: '6px 14px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Field
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 14 }}>
            {fields.map((field, i) => (
              <div key={i} className="panel-elevated" style={{ padding: '16px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 10, color: 'var(--text-dim)', background: 'var(--bg-panel)', padding: '2px 8px', border: '1px solid var(--border)' }}>
                  FIELD {i + 1}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 4 }}>
                      NAME *
                    </label>
                    <input className="input-field" value={field.name} onChange={(e) => updateField(i, 'name', e.target.value)} placeholder="text_input" style={{ fontSize: 12 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 4 }}>
                      LABEL
                    </label>
                    <input className="input-field" value={field.label} onChange={(e) => updateField(i, 'label', e.target.value)} placeholder="Text Input" style={{ fontSize: 12 }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 4 }}>
                      TYPE
                    </label>
                    <select className="input-field" value={field.type} onChange={(e) => updateField(i, 'type', e.target.value)} style={{ fontSize: 12, cursor: 'pointer' }}>
                      {FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 4 }}>
                      DESCRIPTION
                    </label>
                    <input className="input-field" value={field.description} onChange={(e) => updateField(i, 'description', e.target.value)} placeholder="Optional hint" style={{ fontSize: 12 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 1 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" checked={field.required} onChange={(e) => updateField(i, 'required', e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                      Req
                    </label>
                    {fields.length > 1 && (
                      <button onClick={() => removeField(i)} className="btn-danger" style={{ fontSize: 11, padding: '6px 8px' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}