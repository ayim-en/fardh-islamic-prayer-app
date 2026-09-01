# Fardh

An iOS prayer-times app: prayer schedule, qibla, a Hijri calendar, notifications, and a home-screen widget.

## Language

**Key date**:
A date in the Hijri year carrying religious significance, such as Ramadan's start or Lailat-ul-Qadr. One calendar day may carry more than one, and one key date may span several nights.
_Avoid_: important date, holiday, event, special date

**Primary date system**:
Whichever of Gregorian or Hijri the user has selected to lead. It is the date shown on the prayer screen, and the larger of the two wherever both appear. Whether the secondary system is shown at all is the surface's business, not the setting's.
_Avoid_: date format, calendar format, date display mode

**Last third of the night**:
The final third of the interval from Maghrib to Fajr. The night is divided from Maghrib, not from Isha.
_Avoid_: tahajjud time, qiyam time, last third of the day

**Night in progress**:
The night whose last third has not yet ended: the one that opened at yesterday evening's Maghrib until this morning's Fajr, and tonight's from Fajr onwards. A night is dated by the evening it opened on, not by the calendar day its window falls in.
_Avoid_: tonight, current night, today's night

**Widget payload**:
What the app writes to app-group storage for the widget to read: a contiguous run of days of prayer times starting today, the last third of each of their nights as absolute instants, an expiry, and the colours and formats the widget renders with. The widget never fetches, so the payload is the whole of what it knows.
_Avoid_: widget data, widget cache, widget blob

**Widget window**:
How far ahead a widget payload reaches: thirty days, or as much of that as there are prayer times for without a gap. Unrelated to the ten days notifications are scheduled for — see ADR-0002.
_Avoid_: widget range, cache window

**Expiry**:
The first date a widget payload does not cover, stamped in by the app. From that date the widget shows placeholder times and an instruction to open the app, rather than the last day it happens to hold.
_Avoid_: staleness date, cache TTL, expiration date
