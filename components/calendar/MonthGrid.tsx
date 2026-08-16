import type { GridCell } from "@/utils/hijriCalendar";
import React, { memo, useMemo } from "react";
import { View } from "react-native";

import type { CellStyleBundle } from "./cellStyles";
import { DayCell } from "./DayCell";

const COLUMNS = 7;
const ROWS = 6;

export interface MonthGridProps {
  cells: GridCell[]; // always 42
  /** Full page width — kept intact so pagingEnabled snaps against the scroll
   *  view's own frame. The square is centred inside it. */
  width: number;
  cellHeight: number;
  /** Side of the square the grid occupies. */
  gridSide: number;
  selectedIso: string | null;
  onDayPress: (iso: string) => void;
  styles: CellStyleBundle;
}

// One page of the pager. Props are all primitives or stable references, so the
// memo comparison holds and swiping never re-renders a page.
export const MonthGrid = memo(function MonthGrid({
  cells,
  width,
  cellHeight,
  gridSide,
  selectedIso,
  onDayPress,
  styles,
}: MonthGridProps) {
  // Six fixed rows of seven. Using flex:1 per cell rather than a percentage
  // width means the columns divide the page exactly, with no rounding gaps.
  const rows = useMemo(() => {
    const chunked: GridCell[][] = [];
    for (let r = 0; r < ROWS; r++) {
      chunked.push(cells.slice(r * COLUMNS, r * COLUMNS + COLUMNS));
    }
    return chunked;
  }, [cells]);

  return (
    <View style={{ width, alignItems: "center" }}>
      <View style={{ width: gridSide }}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: "row" }}>
            {row.map((cell) => (
              <DayCell
                key={cell.iso}
                iso={cell.iso}
                gregorianDay={cell.gregorianDay}
                hijriLabel={cell.hijriLabel}
                isHijriMonthStart={cell.isHijriMonthStart}
                isOutside={cell.isOutside}
                isSelected={cell.iso === selectedIso}
                hasKeyDate={cell.hasKeyDate}
                height={cellHeight}
                onPress={onDayPress}
                styles={styles}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
});
