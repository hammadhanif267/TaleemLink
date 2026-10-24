"use client";

import { useMemo, useState } from "react";
import AppIcon from "./AppIcon";
import { filterMaterials, materialChapters, MATERIAL_TYPES } from "../lib/materials.mjs";

const humanSize = (bytes) => bytes < 1024 ? `${bytes || 0} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default function MaterialLibrary({ lessons, done, role, subjectChoices, filter, setFilter, search, setSearch,
  onCreate, onEdit, onDelete, onOpen, onMark, busy }) {
  const [typeFilter, setTypeFilter] = useState("All types");
  const [chapterFilter, setChapterFilter] = useState("All chapters");
  const chapters = useMemo(() => materialChapters(lessons, filter), [lessons, filter]);
  const selectedChapter = chapters.includes(chapterFilter) ? chapterFilter : "All chapters";
  const visible = useMemo(() => filterMaterials(lessons, { subject: filter, kind: typeFilter, chapter: selectedChapter, query: search }),
    [lessons, filter, typeFilter, selectedChapter, search]);
  const doneIds = new Set(done);
  const clear = () => { setFilter("All subjects"); setSearch(""); setTypeFilter("All types"); setChapterFilter("All chapters"); };
  return <section className="e-library" aria-label="Learning materials">
    <div className="page-title-row e-heading">
      <div><div className="eyebrow">LEARNING LIBRARY</div><h1>Lessons & notes</h1><p className="subheading">Find written lessons, revision notes, documents and locally saved files.</p></div>
      {role === "teacher" && <button className="primary-button" onClick={onCreate} disabled={busy}><AppIcon name="plus" size={17}/> Add material</button>}
    </div>
    <div className="e-overview" aria-label="Library totals">
      <div><strong>{lessons.length}</strong><span>Materials</span></div>
      <div><strong>{doneIds.size ? lessons.filter(item => doneIds.has(item.id)).length : 0}</strong><span>Completed</span></div>
      <div><strong>{lessons.filter(item => item.attachment).length}</strong><span>Attachments</span></div>
    </div>
    <div className="e-tools">
      <label className="e-search"><AppIcon name="search" size={18}/><span className="e-visually-hidden">Search learning materials</span><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, chapter, content, file…"/></label>
      <label><span className="e-visually-hidden">Filter by subject</span><select aria-label="Filter by subject" value={filter} onChange={e => { setFilter(e.target.value); setChapterFilter("All chapters"); }}><option>All subjects</option>{subjectChoices.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
      <label><span className="e-visually-hidden">Filter by material type</span><select aria-label="Filter by material type" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option>All types</option>{MATERIAL_TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
      <label><span className="e-visually-hidden">Filter by chapter</span><select aria-label="Filter by chapter" value={selectedChapter} onChange={e => setChapterFilter(e.target.value)}><option>All chapters</option>{chapters.map(c => <option key={c}>{c}</option>)}</select></label>
    </div>
    <div className="e-result-line"><span>{visible.length} of {lessons.length} materials</span><button type="button" onClick={clear}>Clear filters</button></div>
    {visible.length ? <div className="e-grid">{visible.map(lesson => {
      const complete = doneIds.has(lesson.id);
      return <article className="e-card" key={lesson.id}>
        <div className="e-card-top"><span className="e-material-icon"><AppIcon name={lesson.kind?.includes("Video") ? "play" : "book-open"} size={22}/></span><span className="e-kind">{lesson.kind || "Learning material"}</span>{complete && <span className="e-complete-mark" title="Completed"><AppIcon name="check" size={15}/></span>}</div>
        <div className="e-card-meta"><span>{lesson.subject}</span>{lesson.chapter && <><b aria-hidden="true">·</b><span>{lesson.chapter}</span></>}</div>
        <h2>{lesson.title}</h2>{lesson.topic && <div className="e-topic">Topic: {lesson.topic}</div>}
        <p>{lesson.description || (lesson.content ? lesson.content.slice(0, 125) : "Open this material to see the resources attached.")}</p>
        <div className="e-resource-tags">{lesson.attachment && <span title={lesson.attachment.name}><AppIcon name="file" size={14}/>{lesson.attachment.name} · {humanSize(lesson.attachment.size)}</span>}{lesson.url && <span><AppIcon name="arrow-up-right" size={14}/> Web resource</span>}{lesson.content && <span><AppIcon name="book" size={14}/> Written lesson</span>}</div>
        <div className="e-card-actions"><button type="button" className="primary-button" onClick={() => onOpen(lesson)}>Read / view <AppIcon name="arrow-right" size={15}/></button>
          <button type="button" className="e-small-action" onClick={() => onMark(lesson.id)} aria-label={complete ? `Mark ${lesson.title} incomplete` : `Mark ${lesson.title} complete`} title={complete ? "Mark incomplete" : "Mark complete"}><AppIcon name="check" size={16}/><span>{complete ? "Done" : "Complete"}</span></button>
          {role === "teacher" && <><button type="button" className="e-icon-action" disabled={busy} onClick={() => onEdit(lesson)} aria-label={`Edit ${lesson.title}`} title="Edit material"><AppIcon name="pencil" size={17}/></button><button type="button" className="e-icon-action e-danger" disabled={busy} onClick={() => onDelete(lesson)} aria-label={`Delete ${lesson.title}`} title="Delete material"><AppIcon name="x" size={17}/></button></>}
        </div>
      </article>;
    })}</div> : <div className="e-empty"><AppIcon name="book-open" size={32}/><h2>{lessons.length ? "No matching materials" : "Your library is empty"}</h2><p>{lessons.length ? "Change the filters or search to find saved materials." : "Use Teacher preview to create your first lesson or resource on this device."}</p>{lessons.length ? <button className="secondary-button" onClick={clear}>Clear all filters</button> : role === "teacher" ? <button className="primary-button" onClick={onCreate}>Create first material</button> : null}</div>}
    <p className="e-local-note"><AppIcon name="database" size={16}/> Records and attachments are stored on this device. Files are not backed up by the record export or synced to other users.</p>
  </section>;
}
