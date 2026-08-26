# One primary date system across both tabs

A single setting — **Primary Date System** — selects Gregorian or Hijri and governs both the prayer screen and the calendar screen, so the two can never disagree about which system leads. On the prayer screen the primary is the only date shown; on the calendar both appear, with the primary as the larger label.

The setting lives under **Calendar** settings despite also driving the prayer screen. This is deliberate, and is the one thing a future reader is likely to misread: the previous arrangement had `carouselDateFormat` filed under Calendar while affecting *only* the prayer carousel, which was a genuine bug and the reason for this rework. Independent per-tab control was rejected — the tabs showing different date systems was the actual complaint.

## Consequences

The ability to select Gregorian-only or Hijri-only on the calendar was dropped; the calendar always shows both and the setting changes only which one is prominent.
