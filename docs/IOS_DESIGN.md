# SeatAI interface

The interface uses iOS conventions for a teacher's daily work: grouped lists,
clear section titles, segmented view controls, readable device typography and
one consistent blue for actions. The classroom map remains the central visual.

Palette: canvas #F2F2F7, surface #FFFFFF, text #1C1C1E, secondary #606069,
separator #DEDEE5, action #0064D9. Dark mode uses black canvas and layered neutral
surfaces. Colors indicating student needs, status and chart series retain their
meaning. No additional web fonts or visual libraries are loaded.

Layout: navigation → page title and primary action → grouped content. Home uses
a quiet split introduction with the seating illustration; staff entrances form
a grouped list. School dashboards use a shared statistics strip, classroom map
and labelled charts. Mobile navigation stays within safe areas, and editing
panels behave as sheets. Text follows the active language direction.

Typography: device system family with 34–52px entry headings, 28–34px page
headings, 17–20px section headings and 14–17px body. Form fields remain 16px on
phones. Touch controls are at least 44px; keyboard focus remains visible.

Scope: home, class setup, classroom controls, students and settings, staff
sign-in/recovery, all school roles, dialogs, questionnaire and print controls.
Printing retains white paper and its existing page dimensions. No permissions,
storage, optimization logic or authentication behavior changes.
