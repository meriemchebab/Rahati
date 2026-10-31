// Month calendar in a bottom sheet for picking one day (period start, due dates).
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { addMonths, dayLabel, monthGrid, monthKey, monthLabel, today, weekInitials } from "./dates";
import { Button } from "./ui";
import { Sheet } from "./Sheet";
import { colors, fonts } from "./theme";
import { mirror, t } from "./i18n";

export function DateSheet({
  visible,
  title,
  value,
  min,
  max,
  marks,
  legend,
  confirmLabel,
  busy,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  value?: string | null;
  min?: string;
  max?: string;
  /** Dot color per day, e.g. logged period starts. */
  marks?: Map<string, string>;
  legend?: string;
  confirmLabel?: string;
  busy?: boolean;
  onPick: (day: string) => void;
  onClose: () => void;
}) {
  const start = () => {
    let d = value ?? today();
    if (max && d > max) d = max;
    if (min && d < min) d = min;
    return monthKey(d);
  };
  const [day, setDay] = useState<string | null>(value ?? null);
  const [month, setMonth] = useState(start);
  useEffect(() => {
    if (visible) {
      setDay(value ?? null);
      setMonth(start());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, value, min, max]);

  const canPrev = !min || addMonths(month, -1) >= monthKey(min);
  const canNext = !max || addMonths(month, 1) <= monthKey(max);
  const now = today();

  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <View style={s.nav}>
        <Pressable disabled={!canPrev} onPress={() => setMonth(addMonths(month, -1))} style={[s.navBtn, !canPrev && { opacity: 0.3 }]} accessibilityLabel={t("Previous month")}>
          <Ionicons style={mirror()} name="chevron-back" size={18} color={colors.ink} />
        </Pressable>
        <Text style={s.month}>{monthLabel(month)}</Text>
        <Pressable disabled={!canNext} onPress={() => setMonth(addMonths(month, 1))} style={[s.navBtn, !canNext && { opacity: 0.3 }]} accessibilityLabel={t("Next month")}>
          <Ionicons style={mirror()} name="chevron-forward" size={18} color={colors.ink} />
        </Pressable>
      </View>
      <View style={s.grid}>
        {weekInitials().map((d, i) => <Text key={i} style={s.wd}>{d}</Text>)}
        {monthGrid(month).map((d, i) => {
          if (!d) return <View key={i} style={s.cell} />;
          const off = (min && d < min) || (max && d > max);
          const on = d === day;
          const mark = marks?.get(d);
          return (
            <Pressable
              key={i}
              disabled={!!off}
              onPress={() => setDay(d)}
              accessibilityLabel={dayLabel(d)}
              accessibilityState={{ selected: on, disabled: !!off }}
              style={[s.cell, d === now && !on && s.today, on && s.on]}
            >
              <Text style={[s.cellText, off && { color: colors.lavender }, on && { color: colors.white }]}>{Number(d.slice(8))}</Text>
              {mark && <View style={[s.dot, { backgroundColor: on ? colors.white : mark }]} />}
            </Pressable>
          );
        })}
      </View>
      {legend ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={[s.dot, { position: "relative", bottom: 0, backgroundColor: colors.pink }]} />
          <Text style={s.legend}>{legend}</Text>
        </View>
      ) : null}
      <Button title={day ? `${confirmLabel ?? t("Save")} · ${dayLabel(day)}` : t("Pick a day")} height={52} disabled={!day} loading={busy} onPress={() => day && onPick(day)} />
    </Sheet>
  );
}

const s = StyleSheet.create({
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  month: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  grid: { flexDirection: "row", flexWrap: "wrap", backgroundColor: colors.white, borderRadius: 20, padding: 8 },
  wd: { width: `${100 / 7}%`, textAlign: "center", fontFamily: fonts.semibold, fontSize: 12, color: colors.muted, paddingVertical: 6 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 999 },
  today: { borderWidth: 1.5, borderColor: colors.purple },
  on: { backgroundColor: colors.ink },
  cellText: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  dot: { position: "absolute", bottom: "12%", width: 6, height: 6, borderRadius: 3 },
  legend: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
});
