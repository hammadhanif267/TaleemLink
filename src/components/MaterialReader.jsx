"use client";
import AppIcon from "./AppIcon";
import { safeMaterialUrl } from "../lib/materials.mjs";

export default function MaterialReader({ lesson, complete, onClose, onToggle, onOpenFile, onDownload }) {
  const website = safeMaterialUrl(lesson.url);
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal e-reader" role="dialog" aria-modal="true" aria-labelledby="e-reader-title">
      <div className="e-reader-header"><div><span className="eyebrow">{lesson.subject}{lesson.chapter ? ` · ${lesson.chapter}` : ""}</span><h2 id="e-reader-title">{lesson.title}</h2><p>{lesson.kind || "Learning material"}{lesson.topic ? ` · ${lesson.topic}` : ""}</p></div><button type="button" className="modal-close" onClick={onClose} aria-label="Close lesson"><AppIcon name="x" size={19}/></button></div>
      <div className="e-reader-body">
        {lesson.description && <p className="e-reader-description">{lesson.description}</p>}
        {lesson.content ? <div className="e-written-content">{lesson.content}</div> : <div className="e-reader-note">{lesson.attachment || website ? "Use the attached resource below to study this lesson." : "This legacy record has no written content or linked file yet. Edit the lesson in Teacher preview to add material."}</div>}
        {lesson.attachment && <div className="e-reader-resource"><div><AppIcon name="file" size={20}/><span><strong>{lesson.attachment.name}</strong><small>Attachment saved in this browser</small></span></div><div className="e-resource-actions"><button type="button" className="secondary-button" onClick={() => onOpenFile(lesson)}>Open <AppIcon name="arrow-up-right" size={15}/></button><button type="button" className="secondary-button" onClick={() => onDownload(lesson)}>Download <AppIcon name="download" size={15}/></button></div></div>}
        {website && <a className="e-external-link" href={website} target="_blank" rel="noopener noreferrer"><AppIcon name="arrow-up-right" size={17}/> Open external learning resource <span>{new URL(website).hostname}</span></a>}
      </div>
      <div className="e-reader-footer"><span>Progress is saved in this browser only.</span><button type="button" className={complete ? "secondary-button" : "primary-button"} onClick={() => onToggle(lesson.id)}><AppIcon name="check" size={17}/>{complete ? "Mark not completed" : "Mark lesson complete"}</button></div>
    </section>
  </div>;
}
