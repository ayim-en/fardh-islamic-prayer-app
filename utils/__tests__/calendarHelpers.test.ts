import { getNextISODate } from "@/utils/calendarHelpers";

describe("getNextISODate", () => {
  it("advances to the next day", () => {
    expect(getNextISODate("2026-03-14")).toBe("2026-03-15");
  });

  it("advances across a month boundary", () => {
    expect(getNextISODate("2026-01-31")).toBe("2026-02-01");
  });

  it("advances across a year boundary", () => {
    expect(getNextISODate("2026-12-31")).toBe("2027-01-01");
  });

  it("advances into the leap day of a leap year", () => {
    expect(getNextISODate("2028-02-28")).toBe("2028-02-29");
  });

  it("advances out of February in a common year", () => {
    expect(getNextISODate("2026-02-28")).toBe("2026-03-01");
  });

  it("returns empty rather than an invalid date for malformed input", () => {
    expect(getNextISODate("")).toBe("");
    expect(getNextISODate("14-03-2026")).toBe("");
    expect(getNextISODate(undefined as unknown as string)).toBe("");
  });
});
