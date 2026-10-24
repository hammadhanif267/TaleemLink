"use client";

import AppIcon from "./AppIcon";

function displayDate(dateKey) {
  if (!dateKey) return "No date";
  const date = new Date(`${dateKey}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "No date" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Metric({ icon, label, value, supporting, onOpen }) {
  return <button className="d-metric" type="button" onClick={onOpen}>
    <span className="d-metric-head"><span className="d-metric-icon"><AppIcon name={icon} size={19}/></span><AppIcon name="arrow-up-right" size={15}/></span>
    <strong className="d-metric-value">{value}</strong><span className="d-metric-label">{label}</span>
    <span className="d-metric-support">{supporting}</span>
  </button>;
}

function EmptyPanel({ icon, title, detail, action, onAction }) {
  return <div className="d-empty"><AppIcon name={icon} size={24}/><strong>{title}</strong><p>{detail}</p>{action && <button className="d-text-action" onClick={onAction}>{action}<AppIcon name="arrow-right" size={15}/></button>}</div>;
}

export default function LearningDashboard({ data, profile, role, today, allSubjects, onNavigate, onCreateTask, onOpenQuiz }) {
  const teacher = role === "teacher";
  const target = Number(profile.dailyTarget) || 30;
  const personalPath = [profile.educationLevel, profile.programme, profile.gradeYear].filter(Boolean).join(" · ");
  const nextQuiz = data.quizzes.unattempted[0];

  return <div className="d-dashboard">
    <div className="d-heading">
      <div><div className="eyebrow">{teacher ? "TEACHER PREVIEW · THIS DEVICE" : "YOUR LEARNING SPACE"}</div>
        <h1>{teacher ? "Workspace overview" : "Learning overview"}</h1>
        <p>{profile.displayName && !teacher ? `${profile.displayName} · ${personalPath || "Personal learning plan"}` : teacher ? "Manage locally saved learning materials and practice, not real student accounts." : "Your study plan, lessons and assignments, based on records saved in this browser."}</p></div>
      <button className="primary-button" onClick={() => teacher ? onCreateTask() : onNavigate("study-plan")}><AppIcon name={teacher ? "plus" : "calendar-days"} size={17}/>{teacher ? "Create assignment" : "Study planner"}</button>
    </div>

    <section className="d-pathway" aria-label="Personal learning pathway">
      <span className="d-pathway-mark"><AppIcon name="graduation" size={25}/></span>
      <div className="d-pathway-copy"><strong>{profile.displayName ? `${profile.displayName}'s learning pathway` : "Set up your learner profile"}</strong>
        <p>{personalPath || "Choose an education level, programme and subjects to tailor your workspace."}</p>
        <span>{profile.subjects.length} selected subjects <span aria-hidden="true">·</span> {target}-minute daily study target (planned, not recorded)</span></div>
      <button className="secondary-button" onClick={() => onNavigate("profile")}>{profile.displayName ? "Edit profile" : "Set up profile"}<AppIcon name="arrow-right" size={16}/></button>
    </section>

    <div className="d-section-head"><div><h2>Learning snapshot</h2><p>Only your saved activity. Empty records stay empty.</p></div><button className="d-text-action" onClick={() => onNavigate("progress")}>Full progress<AppIcon name="arrow-right" size={15}/></button></div>
    <div className="d-metrics">
      <Metric icon="book-open" label="Lessons completed" value={data.lessons.completed} supporting={data.lessons.total ? `of ${data.lessons.total} lessons · ${data.lessons.percent}%` : "No lessons saved"} onOpen={() => onNavigate("lessons")}/>
      <Metric icon="clipboard" label="Assignments pending" value={data.assignments.pending} supporting={data.assignments.overdueCount ? `${data.assignments.overdueCount} overdue` : data.assignments.total ? `${data.assignments.completed} completed` : "No assignments saved"} onOpen={() => onNavigate("assignments")}/>
      <Metric icon="calendar-days" label="Today's sessions" value={data.today.total} supporting={data.today.total ? `${data.today.completed} completed · ${data.today.plannedMinutes} min planned` : today ? "No sessions scheduled" : "Loading local date"} onOpen={() => onNavigate("study-plan")}/>
      <Metric icon="circle-help" label="Quiz attempts" value={data.quizzes.attempts} supporting={data.quizzes.average === null ? "No scores yet" : `${data.quizzes.average}% average on attempts`} onOpen={() => onNavigate("quizzes")}/>
    </div>

    <div className="d-panels">
      <section className="d-panel"><div className="d-panel-head"><div><h2>Upcoming deadlines</h2><p>{data.assignments.overdueCount ? `${data.assignments.overdueCount} overdue assignment${data.assignments.overdueCount > 1 ? "s" : ""}` : "Outstanding assignments by due date"}</p></div><button className="d-text-action" onClick={() => onNavigate("assignments")}>All tasks<AppIcon name="arrow-right" size={15}/></button></div>
        {data.assignments.upcoming.length ? <div className="d-list">{data.assignments.upcoming.map((task) => <button key={task.id} className="d-list-row" onClick={() => onNavigate("assignments")}><span className="d-row-icon"><AppIcon name="clipboard" size={18}/></span><span className="d-row-body"><strong>{task.title}</strong><small>{task.subject || "Unassigned subject"}</small></span><span className={`d-date ${task.timing === "overdue" ? "d-overdue" : ""}`}>{task.timing === "overdue" ? "Overdue · " : task.timing === "today" ? "Today · " : ""}{displayDate(task.due)}</span></button>)}</div> : <EmptyPanel icon="check" title="No pending assignments" detail={data.assignments.total ? "Everything currently assigned has been marked complete or submitted." : "Assignments will appear after they are created in Teacher preview."} action={teacher ? "Create assignment" : "Open assignments"} onAction={teacher ? onCreateTask : () => onNavigate("assignments")}/>}
      </section>
      <section className="d-panel"><div className="d-panel-head"><div><h2>{today ? `Study plan · ${displayDate(today)}` : "Today's study plan"}</h2><p>Scheduled time, not actual minutes studied</p></div><button className="d-text-action" onClick={() => onNavigate("study-plan")}>Planner<AppIcon name="arrow-right" size={15}/></button></div>
        {data.today.sessions.length ? <div className="d-list">{data.today.sessions.map((session) => <button key={session.id} className="d-list-row" onClick={() => onNavigate("study-plan")}><span className="d-row-icon"><AppIcon name={session.done ? "check" : "clock"} size={18}/></span><span className="d-row-body"><strong>{session.title}</strong><small>{session.subject || "General"} · {session.duration} min scheduled</small></span><span className="d-date">{session.done ? "Marked done" : session.start}</span></button>)}</div> : <EmptyPanel icon="calendar-days" title="No sessions today" detail="Plan a session with a subject, start time and realistic goal." action="Open study planner" onAction={() => onNavigate("study-plan")}/>}
      </section>
    </div>

    <div className="d-panels d-panels-secondary">
      <section className="d-panel"><div className="d-panel-head"><div><h2>Lessons & notes</h2><p>Latest entries in your saved library</p></div><button className="d-text-action" onClick={() => onNavigate("lessons")}>Library<AppIcon name="arrow-right" size={15}/></button></div>
        {data.latestMaterials.length ? <div className="d-list">{data.latestMaterials.map((lesson) => <button key={lesson.id} className="d-list-row" onClick={() => onNavigate("lessons")}><span className="d-row-icon"><AppIcon name="book-open" size={18}/></span><span className="d-row-body"><strong>{lesson.title}</strong><small>{lesson.subject || "General"}</small></span><span className="d-date">{lesson.done ? "Completed" : "Not completed"}</span></button>)}</div> : <EmptyPanel icon="book-open" title="No learning materials" detail="Materials created in Teacher preview will appear here." action="Open library" onAction={() => onNavigate("lessons")}/>}
      </section>
      <section className="d-panel"><div className="d-panel-head"><div><h2>Quizzes & practice</h2><p>{data.quizzes.latestAttempt ? `Latest attempt: ${data.quizzes.latestAttempt.percent}%` : "Scores appear after real attempts"}</p></div><button className="d-text-action" onClick={() => onNavigate("quizzes")}>All quizzes<AppIcon name="arrow-right" size={15}/></button></div>
        {nextQuiz ? <div className="d-practice"><span className="d-practice-icon"><AppIcon name="circle-help" size={27}/></span><strong>{nextQuiz.title}</strong><p>{nextQuiz.subject || "General practice"} · Not attempted yet</p><button className="primary-button" onClick={() => onOpenQuiz(nextQuiz.id)}>{teacher ? "View practice" : "Start practice"}<AppIcon name="arrow-right" size={16}/></button></div> : <EmptyPanel icon="circle-help" title={data.quizzes.total ? "No unattempted quizzes" : "No practice quizzes yet"} detail={data.quizzes.total ? "You can revisit quizzes and review your saved attempts." : "Create a quiz in Teacher preview, then practise from Student mode."} action="Open quizzes" onAction={() => onNavigate("quizzes")}/>}
      </section>
    </div>

    <section className="d-subjects"><div className="d-section-head"><div><h2>Your subjects</h2><p>Open materials for your selected or referenced subjects.</p></div><button className="d-text-action" onClick={() => onNavigate("subjects")}>My subjects<AppIcon name="arrow-right" size={15}/></button></div>
      {allSubjects.length ? <div className="d-subject-grid">{allSubjects.slice(0, 6).map((subject) => <button className="d-subject-chip" key={subject.name} onClick={() => onNavigate("subjects")}><AppIcon name={subject.icon || "book-open"} size={19}/><span>{subject.name}</span><AppIcon name="chevron-right" size={15}/></button>)}</div> : <EmptyPanel icon="book-open" title="Choose your subjects" detail="Your subjects will appear here after you select them in your profile." action="Edit profile" onAction={() => onNavigate("profile")}/>}
    </section>
    <p className="d-data-note"><AppIcon name="database" size={15}/> All metrics describe data saved in this browser. There is no cloud sync or verified actual study-time tracking.</p>
  </div>;
}
