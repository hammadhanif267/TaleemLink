/** Dependency-free, consistent outline iconography (24px viewBox). */
const aliases = {
  "t":"graduation", "♙":"users", "♧":"user", "▦":"layout", "▤":"book", "✓":"check", "◷":"clock", "?":"circle-help", "↗":"arrow-up-right", "→":"arrow-right", "›":"chevron-right", "＋":"plus", "⌁":"database", "⌕":"search",
  "∑":"calculator", "Aa":"languages", "⚛":"atom", "❋":"leaf", "⚗":"flask", "⌘":"laptop", "✎":"pencil", "▧":"file", "▶":"play", "✦":"sparkles", "×":"x",
};
const definitions = {
  graduation:<><path d="m2 10 10-5 10 5-10 5z"/><path d="M6 12v5c3.5 3 8.5 3 12 0v-5M22 10v6"/></>,
  layout:<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M9 9h12"/></>,
  book:<><path d="M3 5.5C6 4 9.5 4 12 6c2.5-2 6-2 9-.5V19c-3-1.5-6.5-1.5-9 .5-2.5-2-6-2-9-.5zM12 6v13.5"/></>,
  check:<path d="m5 12 4 4L19 6"/>,
  "circle-help":<><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.5 2.5 0 0 1 4.4 1.5c0 2-2.2 2-2.2 4M12 18h.01"/></>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  'arrow-up-right':<path d="M6 18 18 6M7 6h11v11"/>,
  'arrow-right':<path d="M4 12h16m-7-7 7 7-7 7"/>,
  'chevron-right':<path d="m9 6 6 6-6 6"/>,
  plus:<path d="M12 5v14M5 12h14"/>,
  database:<><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/></>,
  search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  users:<><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5"/></>,
  user:<><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  moon:<path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5z"/>,
  menu:<path d="M4 7h16M4 12h16M4 17h16"/>,
  x:<path d="M5 5 19 19M19 5 5 19"/>,
  settings:<><path d="M10 3h4l.7 2.2 2 .9 2.1-1 2.8 2.8-1 2.1.9 2L24 12l-2.5 1-.9 2 1 2.1-2.8 2.8-2.1-1-2 .9L14 22h-4l-.7-2.2-2-.9-2.1 1-2.8-2.8 1-2.1-.9-2L0 12l2.5-1 .9-2-1-2.1L5.2 4l2.1 1 2-.9z" transform="translate(1 0) scale(.9 1)"/><circle cx="12" cy="12" r="3"/></>,
  'calendar-days':<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
  clipboard:<><rect x="5" y="5" width="14" height="17" rx="2"/><path d="M9 3h6v4H9zM9 12h6M9 16h4"/></>,
  'chart-no-axes':<path d="M4 20V5m0 15h16M8 15l4-5 3 3 5-7"/>,
  laptop:<><rect x="4" y="4" width="16" height="13" rx="1"/><path d="M2 20h20"/></>,
  calculator:<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M9 13h.01M15 13h.01M9 17h.01M15 17h.01"/></>,
  languages:<><path d="M3 5h12M9 3v2M5 9c3 5 6 7 10 9M13 9c-2 5-5 8-9 10M14 21l4-10 4 10M16 17h4"/></>,
  atom:<><circle cx="12" cy="12" r="1.5"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/></>,
  leaf:<><path d="M20 4C10 4 4 9 4 16a4 4 0 0 0 4 4c7 0 12-6 12-16zM4 20c3-5 8-9 12-11"/></>,
  flask:<><path d="M9 3h6M10 3v7L5 19a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 16h8"/></>,
  pencil:<path d="m5 19 4-.7L20 7a2 2 0 0 0-3-3L6 15zM14 7l3 3"/>,
  file:<><path d="M6 2h8l5 5v15H6zM14 2v5h5M9 13h7M9 17h7"/></>,
  play:<><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/></>,
  sparkles:<path d="m12 3 1.7 6.3L20 11l-6.3 1.7L12 19l-1.7-6.3L4 11l6.3-1.7zM20 18l.5 1.5L22 20l-1.5.5L20 22l-.5-1.5L18 20l1.5-.5z"/>,
  'shield-check':<><path d="M12 2 4 6v6c0 5 3.4 8.3 8 10 4.6-1.7 8-5 8-10V6z"/><path d="m8 12 3 3 5-6"/></>,
  'book-open':<><path d="M12 6C9 4 6 4 3 5v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1zM12 6v14"/></>,
};
export default function AppIcon({ name, children, className = "", size = 19 }) {
  const key = aliases[name ?? children] || name || children;
  return <svg className={`app-icon ${className}`} aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{definitions[key] || definitions.book}</svg>;
}
