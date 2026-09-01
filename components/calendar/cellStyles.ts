import { darkModeColors, lightModeColors } from "@/constants/prayers";
import {
  useAnimatedBackgroundColor,
  useAnimatedTextColor,
} from "@/hooks/useAnimatedColor";
import { useMemo } from "react";

type AnimatedTextStyle = ReturnType<typeof useAnimatedTextColor>;
type AnimatedBgStyle = ReturnType<typeof useAnimatedBackgroundColor>;

// Named for the role a colour plays in a cell rather than for a date system:
// either system can land in either line, so "the leading line's ink" is the
// thing that holds, and "the Gregorian one" is not.
export interface CellStyleBundle {
  /** The leading label. */
  ink: AnimatedTextStyle;
  /** The trailing label, a tone down. */
  muted: AnimatedTextStyle;
  /** Shared by the month-start Hijri label, wherever it sits, and the selected day. */
  accent: AnimatedTextStyle;
  /** Key-date marker. */
  dot: AnimatedBgStyle;
}

// Every animated style the grid needs, created ONCE and passed down.
//
// Calling these hooks inside DayCell would mean 42 cells x 3 mounted pages =
// 126 useAnimatedStyle allocations, churned on every page turn. The returned
// bundle is memoised so React.memo on DayCell still short-circuits.
export const useCellStyles = (
  colors: { active: string; inactive: string },
  isDarkMode: boolean
): CellStyleBundle => {
  const inkColor = isDarkMode ? darkModeColors.text : lightModeColors.text;
  // The theme's secondary tone, matching the weekday letters above the grid:
  // both are supporting text around the day numerals.
  const mutedColor = colors.inactive;

  const ink = useAnimatedTextColor(inkColor);
  const muted = useAnimatedTextColor(mutedColor);
  const accent = useAnimatedTextColor(colors.active);
  const dot = useAnimatedBackgroundColor(colors.active);

  return useMemo(
    () => ({ ink, muted, accent, dot }),
    [ink, muted, accent, dot]
  );
};
