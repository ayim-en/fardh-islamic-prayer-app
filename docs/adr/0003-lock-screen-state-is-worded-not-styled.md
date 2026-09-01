# Lock screen widgets say their state in words, not in colour or opacity

On the prayer screen the last third of the night is dimmed outside its window and accented inside it. That treatment does not port to the lock screen. Accessory widgets render in a monochrome tint that discards custom colour and flattens the opacity differences the styling relies on, so a widget that leant on them would show the same thing in both states.

The Last Third widget therefore carries its state in its **wording**: outside the window it names the time the window opens, and inside it says so and names Fajr as the end rather than repeating a start time that has already passed. Its secondary line holds one fixed opacity in both states, matching the Current Prayer widget it sits beside.

This is a deliberate departure from the prayer screen, not an inconsistency to be tidied away later. Aligning the two by styling would delete the state from the lock screen; aligning them by wording would put a sentence where the prayer screen has room for a colour.

## Consequences

Opacity never encodes state in an accessory widget. A future widget that needs to say something conditional says it in the text.

The widget's own state — which night it is speaking for, and whether that night's window is open — is decided from the absolute instants the app writes into the payload (see `utils/widgetPayload.ts`), so the wording turns over at exactly the moments its timeline is built around: the window's start, and Fajr.

Where the payload cannot say — past its expiry, or for a night it could not compute — both times render as placeholders with the instruction to open the app, which is the same failure the other widgets show and the one opening the app genuinely repairs (ADR-0002).
