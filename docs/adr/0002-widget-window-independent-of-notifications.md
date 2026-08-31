# Widget data window is independent of the notification window

The widget caches **30 days** of prayer times; notifications schedule **10 days**. These numbers are unrelated and must not be re-coupled.

iOS caps an app at **64 pending local notifications**, which is why scheduling stops at 10 days (6 prayers × 10 = 60, under the cap; 11 days would be 66 and overflow). That cap binds notification scheduling only. The widget reads a JSON blob from app-group `UserDefaults`, where no such limit applies — 30 days of prayer times is roughly 5KB. The two windows were previously believed to be coupled; they never were, and were not even the same number (7 vs 10), being computed in separate files from separate fetches.

## Consequences

Because the widget contains no networking and cannot refresh itself, a wide cache is its only defence against staleness. Past the cached window it must show `--:--` and an "Open app to refresh" line rather than the last known times, which would be plausible and wrong.
