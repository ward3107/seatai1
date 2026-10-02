import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Pupil links never import or hydrate the teacher roster/database.
const TeacherApplication = lazy(() => import('./app/TeacherApplication'));
const StudentSurveyPage = lazy(() => import('./features/questionnaire/StudentSurveyPage'));
const pupilRoute = location.hash.startsWith('#survey=');
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary name="Application">
      <Suspense fallback={<p role="status" dir="rtl" className="p-6">SeatAI…</p>}>
        {pupilRoute ? <StudentSurveyPage token={location.hash.slice(8)} /> : <TeacherApplication />}
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>,
);
