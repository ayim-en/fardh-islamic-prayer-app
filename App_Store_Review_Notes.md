# App Store Review Notes Fardh

No demo account needed. No login, no accounts, no purchases, no ads.

## WHAT IT DOES

Fardh is a free Islamic prayer app: prayer times for the user's location (via
the AlAdhan API), local notifications at each prayer time, a Qibla compass, a
Hijri calendar, and Home/Lock Screen widgets.

## TESTING LOCATION

1. Launch and swipe through onboarding. On the "Your Location" step tap "Enable
   Permissions" and choose Allow While Using App (a motion prompt for the Qibla
   compass appears too).
2. Finish onboarding. The home screen shows prayer times for the current or
   simulated location, city name in the header.
3. If denied, the app still works; Prayer Times and Qibla screens show a
   "Location Required" card linking to Settings tab > Permissions. Location is
   When In Use only, never background.

## TESTING A NOTIFICATION

Real notifications are scheduled at actual prayer times, so we ship a test
trigger:

1. Settings tab > tap the round "About" section icon 5 times, leaving less
   than 2 seconds between taps (the counter resets after a 2-second pause).
2. A Debug section appears. Tap "Send Test Notification"; a banner fires 5
   seconds later (background the app to see it). "Check Scheduled Notifications"
   shows the count of real scheduled alerts.

## MOTION PERMISSION

Powers the Qibla compass only: rotates the needle toward the Kaaba and pulses
haptics when aligned. Requested only when the user taps Enable Permissions. If
denied, only the Qibla screen is affected.

## BACKGROUND PROCESSING MODE

BGTaskScheduler refreshes the app's own content only: tops up the widget's
30-day prayer time buffer and reschedules local notifications when the 10-day
queue runs low. No location access in the background; it reuses coordinates
cached from the last in-app session.

## PRIVACY

Coordinates go only to api.aladhan.com to compute times and Qibla. We run no
backend and store nothing. No analytics, ads, tracking, or accounts. Privacy
questionnaire: Location, App Functionality, not linked to identity, not used
for tracking.
