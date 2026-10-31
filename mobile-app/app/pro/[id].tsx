import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, Mode, proInfo, proName, Slot } from "../../src/api";
import { useAction, useLoad } from "../../src/hooks";
import { Button, Card, Chip, ErrorText, Screen, SkeletonLines, TopBar } from "../../src/ui";
import { colors, fonts } from "../../src/theme";
import { addMonths, dayLabel, dayOfIso, monthGrid, monthKey, monthLabel, timeLabel, today, weekInitials } from "../../src/dates";
import { mirror, t } from "../../src/i18n";

export default function Professional() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pid = Number(id);
  const router = useRouter();
  const [mode, setMode] = useState<Mode | undefined>();
  const thisMonth = monthKey(today());
  const [month, setMonth] = useState(thisMonth);
  const [day, setDay] = useState<string | null>(null);
  const [picked, setPicked] = useState<Slot | null>(null);
  const cal = useLoad(() => api.calendar(pid, month, mode), [pid, month, mode]);
  const slots = useLoad(() => api.slots(pid, { mode, limit: 100 }), [pid, mode]);
  const book = useAction();
  const info = proInfo(pid);

  const freeByDay = useMemo(() => new Map((cal.data ?? []).map((d) => [d.date, d.free_slots])), [cal.data]);
  const daySlots = (slots.data ?? []).filter((x) => day && dayOfIso(x.starts_at) === day);
  const maxMonth = addMonths(thisMonth, 2);

  return (
    <Screen>
      <TopBar title={t("Book a session")} />
      <Card color={colors.lilac} style={{ alignItems: "center", gap: 6 }}>
        <View style={s.initial}><Text style={s.initialText}>{proName(pid).replace(/^Dr\.?\s*/i, "").charAt(0)}</Text></View>
        <Text style={s.name}>{proName(pid)}</Text>
        {info ? <Text style={s.small}>{[info.city, info.wilaya_name].filter(Boolean).join(", ")}</Text> : null}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
          <Chip label={t("All")} on={!mode} onPress={() => { setMode(undefined); setPicked(null); }} />
          <Chip label={t("Online")} on={mode === "online"} onPress={() => { setMode("online"); setPicked(null); }} />
          <Chip label={t("In person")} on={mode === "in_person"} onPress={() => { setMode("in_person"); setPicked(null); }} />
        </View>
      </Card>

      <Card style={{ gap: 10 }}>
        <View style={s.nav}>
          <Pressable disabled={month <= thisMonth} onPress={() => { setMonth(addMonths(month, -1)); setDay(null); }} style={[s.navBtn, month <= thisMonth && { opacity: 0.3 }]} accessibilityLabel={t("Previous month")}>
            <Ionicons style={mirror()} name="chevron-back" size={18} color={colors.ink} />
          </Pressable>
          <Text style={s.month}>{monthLabel(month)}</Text>
          <Pressable disabled={month >= maxMonth} onPress={() => { setMonth(addMonths(month, 1)); setDay(null); }} style={[s.navBtn, month >= maxMonth && { opacity: 0.3 }]} accessibilityLabel={t("Next month")}>
            <Ionicons style={mirror()} name="chevron-forward" size={18} color={colors.ink} />
          </Pressable>
        </View>
        <View style={s.grid}>
          {weekInitials().map((d, i) => <Text key={i} style={s.wd}>{d}</Text>)}
          {monthGrid(month).map((d, i) => {
            const free = d ? freeByDay.get(d) : undefined;
            const on = d !== null && d === day;
            return (
              <Pressable key={i} disabled={!free} onPress={() => { setDay(d); setPicked(null); }} accessibilityLabel={d ? `${dayLabel(d)}${free ? `, ${t("{n} free", { n: free })}` : ""}` : undefined} style={[s.cell, free ? s.cellFree : null, on && s.cellOn]}>
                {d && <Text style={[s.cellText, !free && { color: colors.lavender }, on && { color: colors.white }]}>{Number(d.slice(8))}</Text>}
              </Pressable>
            );
          })}
        </View>
        {cal.loading && !cal.data ? <SkeletonLines rows={1} /> : null}
        <ErrorText message={cal.error} />
        <Text style={s.small}>{t("Days in lavender have free times.")}</Text>
      </Card>

      {day && (
        <Card style={{ gap: 10 }}>
          <Text style={s.h2}>{dayLabel(day)}</Text>
          {daySlots.length === 0 && !slots.loading && <Text style={s.small}>{t("Nothing free that day any more.")}</Text>}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {daySlots.map((x) => (
              <Chip key={x.id} label={`${timeLabel(x.starts_at)} · ${x.mode === "online" ? t("online") : t("in person")}`} on={picked?.id === x.id} onPress={() => setPicked(x)} />
            ))}
          </View>
        </Card>
      )}

      {picked && (
        <Card color={colors.lavender} style={{ gap: 10 }}>
          <Text style={s.eyebrow}>{t("REQUEST THIS SESSION")}</Text>
          <Text style={s.h2}>{dayLabel(dayOfIso(picked.starts_at))}, {timeLabel(picked.starts_at)}</Text>
          <Text style={s.body}>
            {picked.mode === "online" ? t("Online. Your video link appears once she accepts.") : t("In person. The address is shown once she accepts.")} {t("You choose later what she can see.")}
          </Text>
          <ErrorText message={book.error} />
          <Button
            title={t("Send request")}
            height={52}
            loading={book.busy}
            onPress={async () => { const r = await book.run(() => api.book(picked.id)); if (r) router.replace(`/session/${r.id}?new=1`); else { slots.reload(); cal.reload(); setPicked(null); } }}
          />
        </Card>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  initial: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.pinkSoft, alignItems: "center", justifyContent: "center" },
  initialText: { fontFamily: fonts.bold, fontSize: 28, color: colors.ink },
  name: { fontFamily: fonts.semibold, fontSize: 22, color: colors.ink, textAlign: "center" },
  h2: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.88, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  month: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  wd: { width: `${100 / 7}%`, textAlign: "center", fontFamily: fonts.semibold, fontSize: 12, color: colors.muted, paddingVertical: 6 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 999 },
  cellFree: { backgroundColor: colors.lavender },
  cellOn: { backgroundColor: colors.ink },
  cellText: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
});
