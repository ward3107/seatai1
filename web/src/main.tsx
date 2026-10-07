import React, { lazy, Suspense, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Pupil links never import or hydrate the teacher roster/database.
const TeacherApplication = lazy(() => import('./app/TeacherApplication'));
const StudentSurveyPage = lazy(() => import('./features/questionnaire/StudentSurveyPage'));
const SchoolPortal = lazy(() => import('./features/school/SchoolPortal'));
function ApplicationRoute() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const changed = () => setHash(location.hash);
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  // Loading the school portal never blocks the existing offline seating tool.
  const entryRole = hash === '#school-teacher' ? 'teacher' : hash === '#school-counselor' ? 'counselor' : hash === '#school-principal' ? 'principal' : undefined;
  return hash.startsWith('#survey=') ? <StudentSurveyPage token={hash.slice(8)} /> : hash.startsWith('#school') ? <SchoolPortal previewLocal={hash === '#school-preview'} entryRole={entryRole} /> : <TeacherApplication />;
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary name="Application">
      <Suspense fallback={<p role="status" dir="rtl" className="p-6">SeatAI…</p>}>
        <ApplicationRoute />
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>,
);
