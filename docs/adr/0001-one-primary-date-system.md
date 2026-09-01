# One primary date system across both tabs

A single setting — **Primary Date System** — selects Gregorian or Hijri and governs both the prayer screen and the calendar screen, so the two can never disagree about which system leads. On the prayer screen the primary is the only date shown; on the calendar both appear, with the primary as the larger label.

The setting lives under **Calendar** settings despite also driving the prayer screen. This is deliberate, and is the one thing a future reader is likely to misread: the previous arrangement had `carouselDateFormat` filed under Calendar while affecting *only* the prayer carousel, which was a genuine bug and the reason for this rework. Independent per-tab control was rejected — the tabs showing different date systems was the actual complaint.

## Consequences

The ability to select Gregorian-only or Hijri-only on the calendar was dropped; the setting changes only which system is prominent.

"The calendar shows both" governs the surfaces with room for two dates: the month grid, the calendar header, the month bar and the day sheet. Each shows the primary as the larger label and the other beneath it.

The next key date strip is the exception, and shows one date only — the primary. Its row already fits a label, the key date's name, the date, the countdown and a chevron on one line, with the name flexing to fit, so a second date there would be paid for out of the name, the one thing the row exists to say. The other system is not dropped but deferred: it heads the description the row expands into. See `utils/keyDateLabels.ts`.
