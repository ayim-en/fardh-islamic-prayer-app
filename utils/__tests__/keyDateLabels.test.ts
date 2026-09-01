import { formatKeyDateLabels } from "@/utils/keyDateLabels";

// 18 September 2026 is 6 Rabīʿ al-thānī 1448 — a date whose two systems agree
// on nothing, so a label leaking from the wrong one is obvious.
const KEY_DATE = {
  iso: "2026-09-18",
  hijriDay: 6,
  hijriMonth: 4,
  hijriFullLabel: "6 Rabīʿ al-thānī 1448",
};

describe("formatKeyDateLabels", () => {
  describe("with Gregorian as the primary date system", () => {
    const labels = () => formatKeyDateLabels(KEY_DATE, "gregorian");

    it("shows the abbreviated Gregorian month and the day", () => {
      expect(labels().row).toBe("Sep 18");
    });

    it("leaves the year to the countdown beside it", () => {
      expect(labels().row).not.toContain("2026");
    });

    it("expands to the full Hijri date", () => {
      expect(labels().body).toBe("6 Rabīʿ al-thānī 1448");
    });
  });

  describe("with Hijri as the primary date system", () => {
    const labels = () => formatKeyDateLabels(KEY_DATE, "hijri");

    it("shows the day and the abbreviated Hijri month", () => {
      expect(labels().row).toBe("6 Rab II");
    });

    it("leaves the year to the countdown beside it", () => {
      expect(labels().row).not.toContain("1448");
    });

    it("expands to a full Gregorian date in the calendar header's format", () => {
      expect(labels().body).toBe("September 18, 2026");
    });
  });

  // The month table only reaches 12, so a value outside it has no name to show.
  describe("when the Hijri month name is unavailable", () => {
    const outOfRange = { ...KEY_DATE, hijriMonth: 13 };
    const labels = () => formatKeyDateLabels(outOfRange, "hijri");

    it("falls back to the Gregorian short form", () => {
      expect(labels().row).toBe("Sep 18");
    });

    it("still expands to the other system, whatever the record holds", () => {
      expect(labels().body).toBe(outOfRange.hijriFullLabel);
    });
  });

  // A key date months out lands in a different Gregorian year, and often a
  // different Hijri one: neither row may start quoting a year for it.
  describe("for a date in a different year from today", () => {
    // 15 August 2027 is 12 Rabīʿ al-awwal 1449 — a different year in both
    // systems, so neither row can quietly borrow this year's.
    const nextYear = {
      iso: "2027-08-15",
      hijriDay: 12,
      hijriMonth: 3,
      hijriFullLabel: "12 Rabīʿ al-awwal 1449",
    };

    it("shows no year in the Gregorian row", () => {
      expect(formatKeyDateLabels(nextYear, "gregorian").row).not.toMatch(/\d{4}/);
    });

    it("shows no year in the Hijri row", () => {
      expect(formatKeyDateLabels(nextYear, "hijri").row).toBe("12 Rab I");
    });

    it("carries the year in the expanded body instead", () => {
      expect(formatKeyDateLabels(nextYear, "hijri").body).toBe("August 15, 2027");
      expect(formatKeyDateLabels(nextYear, "gregorian").body).toBe(
        "12 Rabīʿ al-awwal 1449"
      );
    });
  });
});
