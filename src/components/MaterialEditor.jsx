"use client";
import { useRef } from "react";
import AppIcon from "./AppIcon";
import { MATERIAL_TYPES } from "../lib/materials.mjs";

const size = value => value >= 1048576 ? `${(value / 1048576).toFixed(1)} MB` : `${Math.ceil(value / 1024)} KB`;

export default function MaterialEditor({ form, setForm, file, setFile, subjectChoices, editing, existing, busy, onSave, onCancel, removeExisting, setRemoveExisting }) {
  const fileInputRef = useRef(null);
  const change = (key, value) => setForm(old => ({ ...old, [key]: value }));
  const clearFile = () => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; };
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
    <section className="modal e-editor" role="dialog" aria-modal="true" aria-labelledby="e-editor-title">
      <div className="modal-heading"><div><span className="eyebrow">LESSON MANAGEMENT</span><h2 id="e-editor-title">{editing ? "Edit learning material" : "Add learning material"}</h2><p>{editing ? "Update this resource without losing learner completion." : "Create useful content, attach a file or link to a trusted resource."}</p></div><button type="button" className="modal-close" disabled={busy} onClick={onCancel} aria-label="Close"><AppIcon name="x" size={17}/></button></div>
      <form className="form-stack e-editor-form" onSubmit={onSave}>
        <label>Title<input autoFocus required maxLength="140" value={form.title} onChange={e => change("title", e.target.value)} placeholder="e.g. Solving linear equations" /></label>
        <div className="form-two"><label>Subject<select value={form.subject} onChange={e => change("subject", e.target.value)}>{subjectChoices.map(s => <option key={s}>{s}</option>)}</select></label><label>Material type<select value={form.kind} onChange={e => change("kind", e.target.value)}>{MATERIAL_TYPES.map(t => <option key={t}>{t}</option>)}</select></label></div>
        <div className="form-two"><label>Chapter (optional)<input maxLength="100" value={form.chapter} onChange={e => change("chapter", e.target.value)} placeholder="e.g. Chapter 3"/></label><label>Topic (optional)<input maxLength="100" value={form.topic} onChange={e => change("topic", e.target.value)} placeholder="e.g. Linear functions"/></label></div>
        <label>Overview / description<textarea maxLength="1000" rows="2" value={form.description} onChange={e => change("description", e.target.value)} placeholder="What will a student learn?"/></label>
        <label>Written lesson or notes<textarea className="e-content-input" maxLength="30000" rows="7" value={form.content} onChange={e => change("content", e.target.value)} placeholder="Write lesson notes, definitions, examples or exercises here…"/><span className="e-helper">Plain text, up to 30,000 characters. Content is saved on this device.</span></label>
        <div className="form-two"><label>Estimated study duration<input maxLength="50" value={form.length} onChange={e => change("length", e.target.value)} placeholder="e.g. 20 min" /></label><label>External link (optional)<input type="url" maxLength="2048" value={form.url} onChange={e => change("url", e.target.value)} placeholder="https://example.edu/resource"/><span className="e-helper">HTTP and HTTPS links only. External sites require internet.</span></label></div>
        {existing?.attachment && !removeExisting && <div className="e-current-file"><AppIcon name="file" size={19}/><span><strong>{existing.attachment.name}</strong><small>{size(existing.attachment.size)} · Stored in this browser</small></span><button type="button" className="secondary-button" onClick={() => setRemoveExisting(true)} disabled={busy}>Remove file</button></div>}
        {existing?.attachment && removeExisting && <div className="e-current-file"><span>Existing attachment will be removed when changes are saved.</span><button type="button" className="secondary-button" onClick={() => setRemoveExisting(false)} disabled={busy}>Keep existing</button></div>}
        <label>Attach {existing?.attachment ? "a replacement" : "a file"} (optional)<input type="file" ref={fileInputRef} accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.mp4,.webm,.mov,.ppt,.pptx,.doc,.docx" disabled={busy} onChange={e => setFile(e.target.files?.[0] || null)}/><span className="e-helper">PDFs, text, images, documents and videos · 150 MB maximum · browser storage only</span></label>
        {file && <div className="e-current-file"><AppIcon name="file" size={19}/><span><strong>{file.name}</strong><small>{size(file.size)} · Not yet saved</small></span><button type="button" className="secondary-button" onClick={clearFile} disabled={busy}>Cancel replacement</button></div>}
        <div className="e-modal-actions"><button type="button" className="secondary-button" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Saving material…" : editing ? "Save changes" : "Create material"} <AppIcon name="check" size={16}/></button></div>
      </form>
    </section>
  </div>;
}
