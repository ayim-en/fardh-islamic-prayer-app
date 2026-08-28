import { lastThirdSummary } from "@/constants/prayerSettings";

describe("lastThirdSummary", () => {
  it("leads with the chosen option, as the other settings rows do", () => {
    expect(lastThirdSummary(true)).toMatch(/^Show /);
    expect(lastThirdSummary(false)).toBe("Hide");
  });

  it("carries a sample of the label while it is shown", () => {
    expect(lastThirdSummary(true)).toBe("Show (LAST THIRD: 01:28)");
  });

  // Appending the sample to Hide would advertise a label the user has just
  // turned off.
  it("drops the sample once the label is hidden", () => {
    expect(lastThirdSummary(false)).not.toContain("LAST THIRD");
  });
});
