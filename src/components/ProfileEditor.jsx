"use client";

import { useState } from "react";
import AppIcon from "./AppIcon";
import { DEFAULT_PROFILE, EDUCATION_LEVELS, PROGRAMMES, SUBJECT_CATALOGUE, suggestedSubjects, prepareProfile } from "../lib/profile.mjs";

const categoryOptions = ["School learner", "College learner", "University learner", "Technical / vocational learner", "Independent learner"];

export default function ProfileEditor({ profile, onSave }) {
  const [draft, setDraft] = useState({ ...DEFAULT_PROFILE, ...profile, subjects: [...(profile?.subjects || [])] });
  const [customSubject, setCustomSubject] = useState("");
  const [error, setError] = useState("");
  const programmeChoices = PROGRAMMES[draft.educationLevel] || [];
  const suggested = suggestedSubjects(draft.educationLevel, draft.programme);
  const update = (field, value) => { setError(""); setDraft((current) => ({ ...current, [field]: value })); };
  const addSubject = (raw) => {
    const name = raw.trim();
    if (!name || name.length > 80) { setError("Subject names must be between 1 and 80 characters."); return; }
    if (draft.subjects.some((item) => item.toLowerCase() === name.toLowerCase())) { setError("This subject is already selected."); return; }
    if (draft.subjects.length >= 40) { setError("Maximum 40 subjects."); return; }
    update("subjects", [...draft.subjects, name]); setCustomSubject("");
  };
  const removeSubject = (name) => update("subjects", draft.subjects.filter((item) => item !== name));
  const submit = (event) => {
    event.preventDefault();
    const result = prepareProfile(draft);
    if (result.error) { setError(result.error); return; }
    setError(""); onSave(result.profile);
  };
  return <form className="profile-editor" onSubmit={submit} noValidate>
    <div className="profile-intro"><span className="profile-intro-icon"><AppIcon name="user" size={24}/></span><div><h2>Learner profile</h2><p>Define your own education pathway. Nothing is shared with a server or another device.</p></div></div>
    <div className="profile-section"><div className="profile-section-heading"><span>01</span><div><h3>About you</h3><p>Only your display name is required. Your identity stays on this browser.</p></div></div>
      <div className="profile-fields"><label>Display name <span className="required">Required</span><input value={draft.displayName} onChange={(e) => update("displayName", e.target.value)} maxLength={80} placeholder="Your preferred name" required /></label>
        <label>Country or education system <span className="optional">Optional</span><input value={draft.country} onChange={(e) => update("country", e.target.value)} maxLength={80} placeholder="e.g. Pakistan, UK, Kenya" /></label>
        <label>Learner category<select value={draft.learnerCategory} onChange={(e) => update("learnerCategory", e.target.value)}>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>School / college / university <span className="optional">Optional</span><input value={draft.institution} onChange={(e) => update("institution", e.target.value)} maxLength={120} placeholder="Institution or independent study" /></label></div></div>
    <div className="profile-section"><div className="profile-section-heading"><span>02</span><div><h3>Learning pathway</h3><p>Pick your academic level and programme. Custom programmes are supported.</p></div></div>
      <div className="profile-fields"><label>Education level <span className="required">Required</span><select required value={draft.educationLevel} onChange={(e) => { setDraft((current) => ({ ...current, educationLevel: e.target.value, programme: "" })); setError(""); }}><option value="">Choose an education level</option>{EDUCATION_LEVELS.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Class, grade or academic year <span className="optional">Optional</span><input value={draft.gradeYear} onChange={(e) => update("gradeYear", e.target.value)} maxLength={80} placeholder="e.g. Grade 11, Year 2" /></label>
        <label>Study programme <span className="required">Required</span><select value={programmeChoices.includes(draft.programme) ? draft.programme : draft.programme ? "__other" : ""} onChange={(e) => update("programme", e.target.value === "__other" ? "Custom programme" : e.target.value)}><option value="">Choose a programme</option>{programmeChoices.map((item) => <option key={item}>{item}</option>)}{!programmeChoices.includes("Custom programme") && <option value="__other">Other / custom programme</option>}</select></label>
        <label>Custom programme or specialization <span className="optional">Optional</span><input value={draft.programme} onChange={(e) => update("programme", e.target.value)} maxLength={100} placeholder="Your programme or subject area" /></label></div></div>
    <div className="profile-section"><div className="profile-section-heading"><span>03</span><div><h3>My subjects</h3><p>Choose suggested subjects or add any course you study.</p></div></div>
      {suggested.length > 0 && <div className="suggestion-group"><span className="suggestion-title">Suggested for {draft.programme || draft.educationLevel}</span><div className="subject-chips">{suggested.filter((s) => !draft.subjects.includes(s)).map((s) => <button type="button" key={s} className="subject-chip suggest-chip" onClick={() => addSubject(s)}><AppIcon name="plus" size={14}/>{s}</button>)}</div></div>}
      <label className="subject-picker-label">Browse available subjects<select defaultValue="" onChange={(e) => { if (e.target.value) addSubject(e.target.value); e.target.value = ""; }}><option value="">Select a subject to add</option>{SUBJECT_CATALOGUE.filter((s) => !draft.subjects.includes(s)).map((s) => <option key={s}>{s}</option>)}</select></label>
      <div className="custom-subject-row"><label>Add a custom subject<input value={customSubject} maxLength={80} onChange={(e) => setCustomSubject(e.target.value)} placeholder="e.g. Artificial Intelligence" /></label><button type="button" className="secondary-button" onClick={() => addSubject(customSubject)}><AppIcon name="plus" size={16}/> Add</button></div>
      <div className="selected-subjects"><strong>Selected subjects <span>{draft.subjects.length}</span></strong>{draft.subjects.length ? <div className="subject-chips">{draft.subjects.map((s) => <button type="button" className="subject-chip selected-chip" key={s} onClick={() => removeSubject(s)} aria-label={`Remove ${s}`} title={`Remove ${s}`}>{s}<AppIcon name="x" size={14}/></button>)}</div> : <p>No subjects selected. Choose at least one to complete your profile.</p>}</div></div>
    <div className="profile-section"><div className="profile-section-heading"><span>04</span><div><h3>Study preferences</h3><p>Set a realistic daily goal. The platform does not invent completed study hours.</p></div></div><div className="profile-fields"><label>Interface language<select value={draft.language} onChange={(e) => update("language", e.target.value)}><option>English</option><option value="Urdu">Urdu (translation not yet available)</option><option value="Arabic">Arabic (translation not yet available)</option><option value="Other">Other language (translation planned)</option></select><small>The current interface is in English; translations are not yet implemented.</small></label>
      <label>Daily study target (minutes)<input type="number" min="5" max="600" step="5" required value={draft.dailyTarget} onChange={(e) => update("dailyTarget", e.target.value)} /></label>
      <label>Examination date <span className="optional">Optional</span><input type="date" value={draft.examDate} onChange={(e) => update("examDate", e.target.value)} /></label>
      <label className="full-span">Learning goals <span className="optional">Optional</span><textarea rows="3" maxLength={1000} value={draft.goals} onChange={(e) => update("goals", e.target.value)} placeholder="What are you working toward?" /></label></div></div>
    {error && <p className="profile-error" role="alert">{error}</p>}
    <div className="profile-form-actions"><span><AppIcon name="database" size={16}/> Saved locally on this device only</span><button className="primary-button" type="submit"><AppIcon name="check" size={17}/> Save learner profile</button></div>
  </form>;
}
