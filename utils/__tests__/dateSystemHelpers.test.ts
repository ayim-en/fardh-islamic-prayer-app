import { resolveDateLabels } from "@/utils/dateSystemHelpers";

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

  it("puts each system on exactly one side", () => {
    const { leading, trailing } = resolveDateLabels("hijri", LABELS);
    expect([leading, trailing].sort()).toEqual(
      [LABELS.gregorian, LABELS.hijri].sort()
    );
  });

  it("passes labels through untouched rather than reformatting them", () => {
    const odd = { gregorian: "", hijri: "  4 Rabi' al-Awwal  " };
    expect(resolveDateLabels("hijri", odd)).toEqual({
      leading: "  4 Rabi' al-Awwal  ",
      trailing: "",
    });
  });
});
