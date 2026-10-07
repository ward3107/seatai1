# Responsive teacher interface

The home page, setup flow and classroom use a shared four-step guide:
add names, configure the room and rules, generate and adjust seats, export
and keep a backup. All guide text is translated into Hebrew, Arabic,
English and Russian. The guide is available directly in the header,
on the home page and in a collapsed classroom disclosure.

## Device behavior

- Phones under 640px: full-width settings sheet, a separate chart action row,
  large sample-class buttons, visible wizard step labels and stacked movement
  instructions. Print and comparison remain available in Display preferences.
- Tablets under 1024px: settings overlay the classroom without squeezing it.
- Desktop from 1024px: settings dock beside the classroom.
- Touch screens start in Student details mode: tap an occupied seat to open
  the full profile, including locked seats. Select Click for two-tap movement
  or Drag for deliberate long-press movement.
- Student profiles open as a scrollable modal sheet below 1280px, keeping
  the close button visible. They dock beside the map on wider desktops.
- Seat maps keep a readable initial scale and scroll within their own container.
  Zoom buttons adjust the map; selecting the percentage resets its size.
- Quick swipes pan across seats even in Drag mode. When the map is wider than
  the viewport, labeled left/right buttons and a position slider provide another
  way to reach its edges in both RTL and LTR.
- Named section colors distinguish pupil settings (blue), room settings (cyan),
  rules (violet) and the guide steps. Profile sections pair color with text and
  icons for learning, behavior, support needs and adjacent classmates.
- System fonts, safe-area padding and dynamic viewport heights accommodate
  device chrome. Phone input text is at least 16px to avoid iOS input zoom.
- Reduced-motion preferences, keyboard focus handling and RTL remain supported.

## Verification

`web/e2e/responsive.spec.ts` covers 320px and 390px phones, landscape phones,
768px and 1024px tablets and 1440px desktop. It checks sample navigation,
generated maps, guide access, settings, JSON download and page overflow.
Additional checks cover narrow Hebrew, Arabic and Russian interfaces and
creation through the setup steps. Existing mobile tests exercise touch
selection, long-press dragging and room-feature movement.
`student-details.spec.ts` verifies complete profiles and modal/docked behavior.
`map-navigation.mobile.spec.ts` verifies native touch panning across occupied
seats and both navigation methods in Hebrew and English.

Browser emulation verifies layout and interaction; it does not replace
hands-on testing on physical iPhones and iPads. Core class data remains local
to the browser. The guide explains JSON backup rather than implying automatic
cross-device synchronization.
