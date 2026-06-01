import { useEffect } from 'react';
import { useStore } from '../core/store';
import { sanitizeRosterPayload } from '../core/lti/ltiCore';

/**
 * On first load, check for a roster handed over by the LTI launch endpoint in
 * the URL fragment (`#lti=<encoded JSON>`). If present, sanitise it, append the
 * students, and strip the fragment so a refresh doesn't re-import. The payload
 * is treated as untrusted — `sanitizeRosterPayload` rebuilds clean Students.
 */
export function useLtiImport() {
  const addStudent = useStore((s) => s.addStudent);

  useEffect(() => {
    const hash = window.location.hash;
    const marker = '#lti=';
    if (!hash.startsWith(marker)) return;

    // Clear the fragment immediately so a reload can't double-import.
    const encoded = hash.slice(marker.length);
    history.replaceState(null, '', window.location.pathname + window.location.search);

    try {
      const roster = sanitizeRosterPayload(JSON.parse(decodeURIComponent(encoded)));
      if (!roster) return;
      roster.students.forEach((s) => addStudent(s));
    } catch {
      // Malformed fragment — ignore silently.
    }
  }, [addStudent]);
}
