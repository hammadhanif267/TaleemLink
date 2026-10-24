/** Local-only learner profile rules. No account or authentication is implied. */
export const DEFAULT_PROFILE = Object.freeze({
  displayName: "", country: "", learnerCategory: "School learner", institution: "",
  educationLevel: "", gradeYear: "", programme: "", subjects: [],
  language: "English", dailyTarget: 30, examDate: "", goals: "",
});

export const EDUCATION_LEVELS = [
  "Primary school", "Middle school", "Secondary / Matric / SSC", "Higher secondary / Intermediate / HSSC",
  "O-Level", "A-Level", "Undergraduate", "Postgraduate", "Technical / Vocational", "Independent learning",
];

export const PROGRAMMES = {
  "Primary school": ["General primary studies", "Custom programme"],
  "Middle school": ["General middle school", "Custom programme"],
  "Secondary / Matric / SSC": ["General science", "Computer science", "Humanities / Arts", "Custom programme"],
  "Higher secondary / Intermediate / HSSC": ["FSc Pre-Medical", "FSc Pre-Engineering", "ICS", "FA / Humanities", "I.Com / Commerce", "General studies", "Custom programme"],
  "O-Level": ["O-Level / IGCSE", "Custom programme"],
  "A-Level": ["A-Level Sciences", "A-Level Humanities", "A-Level Commerce", "Custom programme"],
  "Undergraduate": ["Undergraduate degree", "University courses", "Custom programme"],
  "Postgraduate": ["Postgraduate degree", "Research", "Custom programme"],
  "Technical / Vocational": ["Technical diploma", "Vocational education", "Certificate course", "Custom programme"],
  "Independent learning": ["Self-directed study", "Professional learning", "Custom programme"],
};

export const SUBJECT_CATALOGUE = [
  "Mathematics", "English", "Urdu", "Physics", "Chemistry", "Biology", "Computer Science",
  "General Science", "Islamiat", "Pakistan Studies", "Statistics", "Economics", "Accounting",
  "Business Studies", "Commerce", "Education", "Civics", "Sociology", "Psychology", "History",
  "Geography", "Political Science", "Fine Arts", "Literature", "Environmental Science", "Arabic",
  "Tarjuma-tul-Quran", "Technical Drawing", "Electrical Technology", "Computer Applications",
];

const suggestions = {
  "FSc Pre-Medical": ["Biology", "Chemistry", "Physics", "English", "Urdu"],
  "FSc Pre-Engineering": ["Mathematics", "Physics", "Chemistry", "English", "Urdu"],
  ICS: ["Computer Science", "Mathematics", "Physics", "Statistics", "English"],
  "I.Com / Commerce": ["Accounting", "Commerce", "Economics", "Business Studies", "English"],
  "FA / Humanities": ["English", "Urdu", "Education", "Civics", "History"],
  "A-Level Sciences": ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science"],
  "A-Level Commerce": ["Accounting", "Economics", "Business Studies", "Mathematics"],
  "General science": ["Mathematics", "English", "Physics", "Chemistry", "Biology"],
  "Computer science": ["Mathematics", "English", "Computer Science", "Physics"],
};

export function suggestedSubjects(educationLevel, programme) {
  if (suggestions[programme]) return suggestions[programme];
  if (educationLevel === "Primary school") return ["Mathematics", "English", "General Science", "Urdu"];
  if (educationLevel === "Middle school") return ["Mathematics", "English", "General Science", "Computer Science"];
  if (educationLevel === "O-Level") return ["Mathematics", "English", "Physics", "Chemistry", "Biology"];
  return [];
}

const isPlainObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const clean = (v, max) => String(v ?? "").trim().slice(0, max);
const hasSafeDate = (value) => value === "" || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00`)) && new Date(`${value}T12:00:00`).toISOString().slice(0,10) === value);

/** Used by persistence validation; never silently drop an invalid stored profile. */
export function validateStoredProfile(profile) {
  if (!isPlainObject(profile)) throw new Error("Saved learner profile is invalid.");
  for (const key of ["displayName", "country", "learnerCategory", "institution", "educationLevel", "gradeYear", "programme", "language", "examDate", "goals"]) {
    if (typeof profile[key] !== "string" || profile[key].length > (key === "goals" ? 1000 : 140)) throw new Error(`Saved learner profile has an invalid ${key}.`);
  }
  if (!Array.isArray(profile.subjects) || profile.subjects.length > 40 || profile.subjects.some((x) => typeof x !== "string" || x.trim().length === 0 || x.length > 80) || new Set(profile.subjects.map((x) => x.toLocaleLowerCase())).size !== profile.subjects.length) {
    throw new Error("Saved learner profile has invalid subjects.");
  }
  if (!Number.isInteger(profile.dailyTarget) || profile.dailyTarget < 5 || profile.dailyTarget > 600 || !hasSafeDate(profile.examDate)) throw new Error("Saved learner profile has invalid study targets or exam date.");
  return profile;
}

/** Draft checks and normalizes user input, returning an explicit validation result. */
export function prepareProfile(draft) {
  if (!isPlainObject(draft)) return { error: "Invalid profile details." };
  const profile = {
    displayName: clean(draft.displayName, 80), country: clean(draft.country, 80),
    learnerCategory: clean(draft.learnerCategory, 80) || DEFAULT_PROFILE.learnerCategory,
    institution: clean(draft.institution, 120), educationLevel: clean(draft.educationLevel, 100),
    gradeYear: clean(draft.gradeYear, 80), programme: clean(draft.programme, 100),
    subjects: (Array.isArray(draft.subjects) ? draft.subjects : []).map((x) => clean(x, 80)).filter((x, index, array) => x && array.findIndex((other) => other.toLowerCase() === x.toLowerCase()) === index),
    language: clean(draft.language, 80) || "English",
    dailyTarget: Number(draft.dailyTarget), examDate: clean(draft.examDate, 10), goals: clean(draft.goals, 1000),
  };
  if (!profile.displayName) return { error: "Enter a display name to save your learner profile." };
  if (!profile.educationLevel) return { error: "Choose your education level." };
  if (!profile.programme) return { error: "Choose or enter a study programme." };
  if (!profile.subjects.length) return { error: "Select at least one subject." };
  if (profile.subjects.length > 40) return { error: "Choose no more than 40 subjects." };
  if (!Number.isInteger(profile.dailyTarget) || profile.dailyTarget < 5 || profile.dailyTarget > 600) return { error: "Daily target must be between 5 and 600 minutes." };
  if (!hasSafeDate(profile.examDate)) return { error: "Enter a valid examination date or leave it blank." };
  if (profile.examDate && profile.examDate < new Date().toISOString().slice(0,10)) return { error: "Examination date cannot be in the past." };
  try { validateStoredProfile(profile); } catch (error) { return { error: error.message }; }
  return { profile };
}

/** Interpret old Phase B track/level settings without inventing a student identity. */
export function fromLegacyPreferences(studyTrack = "", studyLevel = "") {
  return {
    ...DEFAULT_PROFILE,
    programme: studyTrack === "Choose your stream" ? "" : clean(studyTrack, 100),
    gradeYear: studyLevel === "Choose your level" ? "" : clean(studyLevel, 80),
  };
}

export function appearancePreference(value) { return value === "dark" ? "dark" : "light"; }
