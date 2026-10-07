# Classroom printing and PDF

After generating a seating arrangement, open **Print**. Enter a class name or
use the name of the currently saved project, check the preview and choose
**Print** or **Save as PDF**. The Export menu also downloads the clean chart as
a PDF or PNG. Browser printing uses A4 landscape; disable browser headers and
footers if the browser adds them.

The page shows full names, numbered seats, the board/front direction, empty
seats, reserved desk/obstacle cells and configured doors/windows/teacher desk.
Pairs and clusters retain their desk grouping. Custom rows remain centered and
can exceed the old column count. Dense circles use full-name callouts connected
to numbered physical seats, rather than overlapping tiny name cards.

The standalone SVG renderer reads the actual layout and seat assignments. It
shares room geometry with the editor, preserves physical left/right in RTL and
matches legacy row charts that inherited the interface direction. It does not
capture the interactive DOM, zoom, pan, selected seat or visible profile badges.
The preview, browser print, PDF and PNG all use the same complete page.

Browser printing retains vector SVG text and geometry. Downloaded PDF/PNG use
the browser's Hebrew/Arabic text shaping at 300 dpi on one A4 landscape page.
PDF page content is an image; names are visually readable but not searchable
PDF text. No fonts or pupil images are fetched for this renderer, and all
rendering/downloads happen locally. A larger physical print can improve
readability for unusually dense classes.

The default chart contains names and seat locations, with no grades, health
markers, profile photos, private notes, scores or optimizer warnings. The print
dialog's additional teacher options can explicitly enable needs/attainment
markers or initials-only names; initials suppress those markers. Direct PDF
and PNG exports always use the pupil-facing default. A changed roster with
pupils missing from the current arrangement blocks export and requests a new
arrangement rather than silently omitting them.

Verification covers actual seat/name completeness across all five layout types,
60-seat rows, centered uneven rows, RTL direction, overlap, long names, escaping,
missing assignments and privacy. Browser tests cover phone/desktop previews,
unchanged page output after viewport changes, 300-dpi PNG downloads, single-page
PDF downloads, native print media, and text staying inside its name card.
