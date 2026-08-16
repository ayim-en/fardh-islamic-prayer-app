import { darkModeColors, lightModeColors } from "@/constants/prayers";
import {
  useAnimatedBackgroundColor,
  useAnimatedTextColor,
} from "@/hooks/useAnimatedColor";
import { useMemo } from "react";

type AnimatedTextStyle = ReturnType<typeof useAnimatedTextColor>;
type AnimatedBgStyle = ReturnType<typeof useAnimatedBackgroundColor>;

export interface CellStyleBundle {
  gregorian: AnimatedTextStyle;
  hijri: AnimatedTextStyle;
  /** Shared by the month-start Hijri label and the selected day's numeral. */
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
  const hijriColor = colors.inactive;

  const gregorian = useAnimatedTextColor(inkColor);
  const hijri = useAnimatedTextColor(hijriColor);
  const accent = useAnimatedTextColor(colors.active);
  const dot = useAnimatedBackgroundColor(colors.active);

  return useMemo(
    () => ({ gregorian, hijri, accent, dot }),
    [gregorian, hijri, accent, dot]
  );
};
