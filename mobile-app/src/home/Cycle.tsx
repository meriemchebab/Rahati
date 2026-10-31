// "Your cycle" card from the Home design: ring, phases, three stats, two actions.
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { api } from "../api";
import { useAction } from "../hooks";
import { Button, Card, Chip, ErrorText, Notice } from "../ui";
import { Sheet } from "../Sheet";
import { DateSheet } from "../DateSheet";
import { colors, fonts } from "../theme";
import { addDays, dayLabel, daysBetween, today } from "../dates";
import { CYCLE_LENGTH, Phase, PHASES, periodStarts, phaseOf, rememberPeriodStart, saveSymptoms, symptoms } from "../local";
import { t } from "../i18n";

const SIZE = 196;
const STROKE = 26;
const R = (SIZE - STROKE) / 2;
const C = SIZE / 2;
const GAP_DEG = 1.4; // half the white gap between phases

function point(deg: number, r = R) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
}
function arc(fromDeg: number, toDeg: number) {
  const a = point(fromDeg), b = point(toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${R} ${R} 0 ${large} 1 ${b.x} ${b.y}`;
}
const degOfDay = (d: number) => ((d - 1) / CYCLE_LENGTH) * 360;

function Ring({ day }: { day: number | null }) {
  const marker = day ? point(degOfDay(day) + 360 / CYCLE_LENGTH / 2) : null;
  return (
    <Svg width={SIZE} height={SIZE}>
      {PHASES.map((p) => (
        <Path
          key={p.name}
          d={arc(degOfDay(p.from) + GAP_DEG, degOfDay(p.to + 1) - GAP_DEG)}
          stroke={day ? p.color : colors.tint}
          strokeWidth={STROKE}
          strokeLinecap="butt"
          fill="none"
        />
      ))}
      {marker && <Circle cx={marker.x} cy={marker.y} r={10} fill={colors.white} stroke={colors.purple} strokeWidth={3} />}
    </Svg>
  );
}

const SYMPTOMS = ["Cramps", "Headache", "Bloating", "Tiredness", "Back pain", "Acne", "Cravings", "Tender breasts", "Low mood", "Trouble sleeping"];

export function CycleCard({ professional }: { professional?: string | null }) {
  const [starts, setStarts] = useState<string[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [symOpen, setSymOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const act = useAction();

  const load = useCallback(async () => {
    setStarts(await periodStarts());
    const todayLog = (await symptoms()).find((x) => x.date === today());
    setPicked(todayLog?.items ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const last = starts.filter((d) => d <= today()).pop() ?? null;
  const day = last ? (daysBetween(last, today()) % CYCLE_LENGTH) + 1 : null;
  const phase: Phase | null = day ? phaseOf(day) : null;
  const toOvulation = day ? (day < 14 ? 14 - day : 14 + CYCLE_LENGTH - day) : null;
  const toPeriod = day ? CYCLE_LENGTH - day + 1 : null;
  const fertileIn = day ? (day >= 10 && day <= 15 ? 0 : day < 10 ? 10 - day : 10 + CYCLE_LENGTH - day) : null;

  const log = async (d: string) => {
    setMsg(null);
    const r = await act.run(() => api.cycleStart(d));
    if (r) {
      await rememberPeriodStart(r.start_date);
      await load();
      setLogOpen(false);
      setCalOpen(false);
      setMsg(t("Period start saved for {day}.", { day: dayLabel(r.start_date) }));
    }
  };
  const marks = useMemo(() => new Map(starts.map((d) => [d, colors.pink])), [starts]);

  return (
    <Card style={{ gap: 14, alignItems: "center" }}>
      <View style={s.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.title}>{t("Your cycle")}</Text>
          <Text style={s.sub}>{day ? t("Day {day} of {len} · {phase} phase", { day, len: CYCLE_LENGTH, phase: t(phase!) }) : t("Log your period to see your cycle")}</Text>
        </View>
        <Button title={t("+ Log period")} kind="soft" height={40} style={{ paddingHorizontal: 14 }} textStyle={{ fontSize: 13 }} onPress={() => { act.setError(null); setLogOpen(true); }} />
      </View>

      <View style={{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }}>
        <Ring day={day} />
        <View style={s.center}>
          {day ? (
            <>
              <Text style={s.dayBig}>Day {day}</Text>
              <Text style={s.phase}>{phase ? t(phase) : null}</Text>
              <Text style={s.small}>{toOvulation === 0 ? t("Ovulation today") : t("Ovulation in {n} days", { n: toOvulation ?? "" })}</Text>
            </>
          ) : (
            <Text style={[s.small, { textAlign: "center", width: 110 }]}>{t("No period logged yet")}</Text>
          )}
        </View>
      </View>

      <View style={s.phases}>
        {PHASES.map((p) => {
          const on = phase === p.name;
          return (
            <View key={p.name} style={[s.phaseChip, on && s.phaseOn]}>
              <View style={[s.dot, { backgroundColor: p.color }]} />
              <Text style={[s.phaseName, on && { fontFamily: fonts.semibold }]}>{t(p.name)}</Text>
              <Text style={s.phaseDays}>Days {p.from}–{p.to}</Text>
            </View>
          );
        })}
      </View>

      <View style={s.stats}>
        <Stat color={colors.pink} label={t("Next period")} value={toPeriod ? t("{n} days", { n: toPeriod }) : "—"} />
        <Stat color={colors.lavender} label={t("Fertile window")} value={fertileIn === null ? "—" : fertileIn === 0 ? t("Now") : t("In {n} days", { n: fertileIn })} />
        <Stat color={colors.lilac} label={t("Current phase")} value={phase === "Menstruation" ? t("Period") : phase ? t(phase) : "—"} />
      </View>

      <View style={s.actions}>
        <Button title={t("Track symptoms")} kind="outline" style={{ flex: 1, paddingHorizontal: 12 }} textStyle={{ fontSize: 13 }} onPress={() => setSymOpen(true)} />
        <Button title={t("Open calendar")} kind="pink" style={{ flex: 1, paddingHorizontal: 12 }} textStyle={{ fontSize: 13 }} onPress={() => { act.setError(null); setCalOpen(true); }} />
      </View>
      <Notice message={msg} />
      <Text style={s.note}>
        {professional ? t("Only you see your cycle. {name} sees it only if you turn sharing on.", { name: professional }) : t("Only you see your cycle. A professional sees it only if you turn sharing on.")}
      </Text>

      <DateSheet visible={logOpen} title={t("When did it start?")} max={today()} min={addDays(today(), -120)} marks={marks} busy={act.busy} onPick={log} onClose={() => setLogOpen(false)} />
      <DateSheet visible={calOpen} title={t("Your period calendar")} max={today()} min={addDays(today(), -365)} marks={marks} legend={t("Pink dots are the period starts you logged.")} confirmLabel={t("Log period start")} busy={act.busy} onPick={log} onClose={() => setCalOpen(false)} />
      <Sheet visible={symOpen} title={t("How does your body feel today?")} onClose={() => setSymOpen(false)}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {SYMPTOMS.map((x) => (
            <Chip key={x} label={t(x)} on={picked.includes(x)} onPress={() => setPicked((p) => (p.includes(x) ? p.filter((y) => y !== x) : [...p, x]))} />
          ))}
        </View>
        <Text style={s.note}>{t("Saved on this phone only.")}</Text>
        <Button title={t("Save")} height={52} onPress={async () => { await saveSymptoms(picked); setSymOpen(false); setMsg(picked.length ? t("Symptoms saved for today.") : null); }} />
      </Sheet>
      <ErrorText message={act.error} />
    </Card>
  );
}

function Stat({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={s.stat}>
      <View style={[s.statIcon, { backgroundColor: color }]} />
      <Text style={s.statLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Text>
      <Text style={s.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "stretch" },
  title: { fontFamily: fonts.semibold, fontSize: 20, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  center: { position: "absolute", alignItems: "center" },
  dayBig: { fontFamily: fonts.bold, fontSize: 30, color: colors.ink, lineHeight: 38 },
  phase: { fontFamily: fonts.semibold, fontSize: 14, color: colors.purple },
  small: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink },
  phases: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: 6, rowGap: 8 },
  phaseChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.tint, borderWidth: 1.5, borderColor: colors.tint },
  phaseOn: { backgroundColor: colors.white, borderColor: colors.ink },
  dot: { width: 9, height: 9, borderRadius: 5 },
  phaseName: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  phaseDays: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  stats: { flexDirection: "row", gap: 8, alignSelf: "stretch" },
  stat: { flex: 1, backgroundColor: colors.tint, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 8, alignItems: "center", gap: 6 },
  statIcon: { width: 26, height: 26, borderRadius: 7, marginBottom: 4 },
  statLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, textAlign: "center" },
  statValue: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, textAlign: "center" },
  actions: { flexDirection: "row", gap: 8, alignSelf: "stretch" },
  note: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.muted, alignSelf: "stretch" },
});
