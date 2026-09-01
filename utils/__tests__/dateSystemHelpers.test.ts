import {
  resolveBothDateLabels,
  resolveBySystem,
  resolveDateLabels,
} from "@/utils/dateSystemHelpers";

// Two rendered dates for the same day, as the calling components produce them.
const LABELS = {
  gregorian: "Thursday, 27 August",
  hijri: "Al-Khamis, 4 Rabi' al-Awwal",
};

describe("resolveDateLabels", () => {
  it("leads with the Gregorian date when Gregorian is primary", () => {
    expect(resolveDateLabels("gregorian", LABELS)).toEqual({
      leading: LABELS.gregorian,
      trailing: LABELS.hijri,
    });
  });

  it("leads with the Hijri date when Hijri is primary", () => {
    expect(resolveDateLabels("hijri", LABELS)).toEqual({
      leading: LABELS.hijri,
      trailing: LABELS.gregorian,
    });
  });

  it("passes labels through untouched rather than reformatting them", () => {
    const odd = { gregorian: "", hijri: "  4 Rabi' al-Awwal  " };
    expect(resolveDateLabels("hijri", odd)).toEqual({
      leading: "  4 Rabi' al-Awwal  ",
      trailing: "",
    });
  });

  // A surface showing one date shows the primary or nothing: the prayer screen
  // must not quietly answer with the other system (ADR-0001).
  it("leaves the leading slot empty when the primary date is unknown", () => {
    expect(
      resolveDateLabels("hijri", { gregorian: "August 31, 2026", hijri: null })
    ).toEqual({ leading: "", trailing: "August 31, 2026" });
  });

  it("renders a missing label as an empty string rather than null", () => {
    expect(resolveDateLabels("gregorian", { gregorian: null, hijri: null })).toEqual({
      leading: "",
      trailing: "",
    });
  });
});

describe("resolveBothDateLabels", () => {
  it("orders the pair the way the plain resolver does", () => {
    expect(resolveBothDateLabels("hijri", LABELS)).toEqual({
      leading: LABELS.hijri,
      trailing: LABELS.gregorian,
    });
  });

  // The Hijri label is unknown for any day the cached calendar doesn't reach.
  it("gives the larger slot to the Gregorian date when the Hijri one is unknown", () => {
    expect(
      resolveBothDateLabels("hijri", { gregorian: "August 31, 2026", hijri: null })
    ).toEqual({ leading: "August 31, 2026", trailing: "" });
  });

  it("gives it to the Hijri date when the Gregorian one is unknown", () => {
    expect(
      resolveBothDateLabels("gregorian", {
        gregorian: null,
        hijri: "18 Rabīʿ al-awwal 1448",
      })
    ).toEqual({ leading: "18 Rabīʿ al-awwal 1448", trailing: "" });
  });

  it("leaves both slots empty when neither date is known", () => {
    expect(resolveBothDateLabels("hijri", { gregorian: null, hijri: null })).toEqual({
      leading: "",
      trailing: "",
    });
  });
});

describe("resolveBySystem", () => {
  // The calendar resolves more than strings: the header sizes its two lines
  // against how long each system's longest label runs.
  const MAX_CHARS = { gregorian: 18, hijri: 25 };

  it("gives the leading slot the primary system's value", () => {
    expect(resolveBySystem("hijri", MAX_CHARS)).toEqual({
      leading: 25,
      trailing: 18,
    });
  });

  it("leaves Gregorian leading by default", () => {
    expect(resolveBySystem("gregorian", MAX_CHARS)).toEqual({
      leading: 18,
      trailing: 25,
    });
  });

});
