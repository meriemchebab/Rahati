import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Analytics, api } from "../../src/api";
import { useAction, useLoad } from "../../src/hooks";
import { Appear, Bone, Card, ErrorText, Icon, Screen, Skeleton, Tag } from "../../src/ui";
import { colors, fonts, topicLabel } from "../../src/theme";
import { addDays, today, weekdayShort } from "../../src/dates";
import { t } from "../../src/i18n";

type Range = 7 | 30 | 90;

// Known pattern codes from the backend; anything new falls back to its code, tidied.
const PATTERN_LABELS: Record<string, string> = { mood_dip: "Mood dip", big_swings: "Big mood swings", low_energy: "Low energy" };
const patternLabel = (code: string) => (PATTERN_LABELS[code] ? t(PATTERN_LABELS[code]) : null) ?? code.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
type Bar = { label: string; mood: number | null; energy: number | null; today?: boolean };

/** 7 days: one bar pair per day. 30/90: averaged by week so bars stay readable. */
function bars(a: Analytics): Bar[] {
  if (a.range === 7) {
    return a.series.map((p) => ({ label: weekdayShort(p.date), mood: p.mood, energy: p.energy, today: p.date === today() }));
  }
  const size = 7;
  const out: Bar[] = [];
  for (let i = 0; i < a.series.length; i += size) {
    const chunk = a.series.slice(i, i + size).filter((p) => p.mood !== null);
    const avg = (k: "mood" | "energy") => (chunk.length ? chunk.reduce((n, p) => n + (p[k] ?? 0), 0) / chunk.length : null);
    out.push({ label: a.series[i].date.slice(8, 10) + "/" + a.series[i].date.slice(5, 7), mood: avg("mood"), energy: avg("energy"), today: i + size >= a.series.length });
  }
  return out.slice(-7);
}

const TRACK_H = 130;
// Placeholder for the chart and its tiles while the numbers load: same sizes, faded bars.
const GHOST = [0.6, 0.8, 0.45, 0.7, 0.9, 0.55, 0.75];
function StatsSkeleton() {
  return (
    <Skeleton style={{ gap: 16 }}>
      <View style={[c.grid, { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", marginLeft: 20 }]}>
        {GHOST.map((h, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "flex-end", gap: 3 }}>
            <Bone w={10} h={h * TRACK_H} r={5} />
            <Bone w={10} h={h * 0.8 * TRACK_H} r={5} />
          </View>
        ))}
      </View>
      <View style={[s.tile, { gap: 8 }]}><Bone w="30%" h={10} color="#E4DAFF" /><Bone w="18%" h={22} color="#E4DAFF" /><Bone w="40%" h={10} color="#E4DAFF" /></View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[0, 1].map((i) => <View key={i} style={[s.tile, { flex: 1, gap: 8 }]}><Bone w="70%" h={10} color="#E4DAFF" /><Bone w="35%" h={22} color="#E4DAFF" /><Bone w="80%" h={10} color="#E4DAFF" /></View>)}
      </View>
    </Skeleton>
  );
}

function Chart({ data }: { data: Bar[] }) {
  return (
    <View style={c.wrap}>
      <View style={c.axis}>
        {[5, 4, 3, 2, 1, 0].map((n) => (
          <Text key={n} style={c.axisText}>{n}</Text>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <View style={c.grid}>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <View key={n} style={[c.gridLine, { top: (TRACK_H / 5) * n }]} />
          ))}
          <View style={c.cols}>
            {data.map((b, i) => (
              <View key={i} style={c.col}>
                <View style={c.track}>
                  {b.mood === null ? (
                    <View style={c.gap} />
                  ) : (
                    <View style={c.pair}>
                      <View style={[c.bar, { height: Math.max(8, (b.mood / 5) * TRACK_H), backgroundColor: colors.purple }]}>
                        <View style={[c.cap, { backgroundColor: "#A9A7FF" }]} />
                      </View>
                      <View style={[c.bar, { height: Math.max(8, ((b.energy ?? 0) / 5) * TRACK_H), backgroundColor: colors.pink }]}>
                        <View style={[c.cap, { backgroundColor: "#FDC4FF" }]} />
                      </View>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
        <View style={c.cols}>
          {data.map((b, i) => (
            <View key={i} style={c.col}>
              {b.today ? (
                <View style={c.todayPill}><Text style={c.todayText}>{t("Today")}</Text></View>
              ) : (
                <Text style={c.day}>{b.label}</Text>
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// Solid ring with square ends (no rounded caps), filled to the share of days checked in.
function RingProgress({ done, total }: { done: number; total: number }) {
  const size = 64, w = 10, r = (size - w) / 2, c = size / 2;
  const pt = (deg: number) => { const t = ((deg - 90) * Math.PI) / 180; return `${c + r * Math.cos(t)} ${c + r * Math.sin(t)}`; };
  const arc = (to: number) => `M ${pt(0)} A ${r} ${r} 0 ${to > 180 ? 1 : 0} 1 ${pt(to)}`;
  const filled = total ? Math.min(done, total) / total : 0;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={c} cy={c} r={r} stroke={colors.lilac} strokeWidth={w} fill="none" />
        {filled >= 1 ? (
          <Circle cx={c} cy={c} r={r} stroke={colors.purple} strokeWidth={w} fill="none" />
        ) : filled > 0 ? (
          <Path d={arc(filled * 360)} stroke={colors.purple} strokeWidth={w} strokeLinecap="butt" fill="none" />
        ) : null}
      </Svg>
      <Text style={s.ringText}>{done}/{total}</Text>
    </View>
  );
}

export default function Stats() {
  const [range, setRange] = useState<Range>(7);
  const q = useLoad(() => api.analytics(range), [range]);
  const checkIns = useLoad(() => api.checkIns());
  const patterns = useLoad(() => api.patterns());
  const ai = useAction();
  const [summary, setSummary] = useState<string | null>(null);

  const a = q.data;
  // Days elapsed in the window that could have a check-in (the window ends today).
  const total = a ? a.series.length : range;
  const topTopics = useMemo(() => {
    const since = addDays(today(), -(range - 1));
    const counts = new Map<string, number>();
    for (const c of checkIns.data ?? []) {
      if (c.checkin_date < since) continue;
      for (const t of c.topics ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3);
  }, [checkIns.data, range]);

  const change = a?.mood_change;
  const changeText =
    change === null || change === undefined
      ? t("No earlier week to compare")
      : change === 0
        ? t(range === 7 ? "Same as last week" : "Same as last period")
        : t(change > 0 ? (range === 7 ? "{n} higher than last week" : "{n} higher than last period") : range === 7 ? "{n} lower than last week" : "{n} lower than last period", { n: Math.abs(change) });

  return (
    <Screen tabs refreshing={q.refreshing} onRefresh={() => { q.reload(); patterns.reload(); }}>
      <Card style={{ gap: 16 }}>
        <Text style={s.title}>{t("Statistics")}</Text>
        <View style={s.rowCenter}>
          <Text style={s.h2}>{range === 7 ? t("Your week") : range === 30 ? t("Your month") : t("Your 3 months")}</Text>
          <View style={s.range}>
            {([7, 30, 90] as Range[]).map((r) => (
              <Pressable key={r} onPress={() => { setRange(r); setSummary(null); }} style={[s.rangeItem, range === r && s.rangeOn]} accessibilityRole="button" accessibilityState={{ selected: range === r }}>
                <Text style={[s.rangeText, range === r && s.rangeTextOn]}>{r === 7 ? t("7 days") : r}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <ErrorText message={q.error} />
        {!a ? <StatsSkeleton /> : <Appear><Chart data={bars(a)} /></Appear>}
        <View style={s.legend}>
          <View style={s.legendItem}><View style={[s.dot, { backgroundColor: colors.purple }]} /><Text style={s.legendText}>{t("Mood")}</Text></View>
          <View style={s.legendItem}><View style={[s.dot, { backgroundColor: colors.pink }]} /><Text style={s.legendText}>{t("Energy")}</Text></View>
          <View style={s.legendItem}><View style={[s.dot, s.dotDashed]} /><Text style={s.legendText}>{t("Gap = no check-in")}</Text></View>
        </View>

        {a && (
          <Appear style={{ gap: 16 }}>
            <View style={[s.tile, s.rowCenter]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.tileLabel}>{t("Check-ins")}</Text>
                <Text style={s.tileValue}>{a.check_in_count}</Text>
                <Text style={s.tileSub}>{t("of the last {n} days", { n: total })}</Text>
              </View>
              <RingProgress done={a.check_in_count} total={total} />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={[s.tile, { flex: 1 }]}>
                <Text style={s.tileLabel}>{t("Average mood")}</Text>
                <Text style={s.tileValue}>{a.average_mood ?? "—"}</Text>
                <Text style={s.tileSub}>{changeText}</Text>
              </View>
              <View style={[s.tile, { flex: 1 }]}>
                <Text style={s.tileLabel}>{t("Average energy")}</Text>
                <Text style={s.tileValue}>{a.average_energy ?? "—"}</Text>
                <Text style={s.tileSub}>{t("out of 5")}</Text>
              </View>
            </View>
          </Appear>
        )}

        <View style={[s.rowCenter, { alignItems: "flex-start", gap: 10 }]}>
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={s.mindTitle}>{t("Most on your mind")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {topTopics.length ? topTopics.map(([code, n]) => <Tag key={code} label={`${topicLabel(code)} · ${n}`} color={colors.lavender} />) : <Text style={s.tileSub}>{t("Tag topics when you check in.")}</Text>}
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={async () => { const r = await ai.run(() => api.summary(range)); if (r) setSummary(r.summary); }}
            style={({ pressed }) => [s.aiBtn, pressed && { opacity: 0.85 }]}
          >
            <Icon name="aiCheck" width={16} />
            <Text style={s.aiText}>{ai.busy ? t("Writing…") : t("Get AI summary")}</Text>
          </Pressable>
        </View>
        <ErrorText message={ai.error} />
        {summary && (
          <View style={[s.tile, { backgroundColor: "#FDE6FF" }]}>
            <Text style={s.tileLabel}>{t("AI SUMMARY · FROM YOUR NUMBERS ONLY")}</Text>
            <Text style={s.summary}>{summary}</Text>
          </View>
        )}

        {/* Only shown once the backend has noticed something; stays hidden otherwise. */}
        {!!(patterns.data?.patterns.length || patterns.data?.summary) && (
          <View style={{ gap: 8 }}>
            <Text style={s.mindTitle}>{t("Patterns noticed")}</Text>
            {patterns.data?.summary && <Text style={s.summary}>{patterns.data.summary.body}</Text>}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {patterns.data?.patterns.map((x) => (
                <Tag key={`${x.type}-${x.from}`} label={`${patternLabel(x.type)} · ${t("{from} to {to}", { from: x.from.slice(5), to: x.to.slice(5) })}`} color={colors.tint} />
              ))}
            </View>
          </View>
        )}
      </Card>
    </Screen>
  );
}

const c = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 8 },
  axis: { height: TRACK_H + 12, justifyContent: "space-between", paddingTop: 0, marginTop: -2 },
  axisText: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, textAlign: "right", width: 12 },
  grid: { height: TRACK_H, marginTop: 6 },
  gridLine: { position: "absolute", left: 0, right: 0, borderTopWidth: 1, borderColor: "#E3DAF5", borderStyle: "dashed" },
  cols: { flexDirection: "row", gap: 6 },
  col: { flex: 1, alignItems: "center" },
  track: { width: "100%", maxWidth: 36, height: TRACK_H, backgroundColor: colors.tint, borderRadius: 6, justifyContent: "flex-end", alignItems: "center" },
  pair: { flexDirection: "row", gap: 4, alignItems: "flex-end" },
  bar: { width: 14, borderRadius: 7, overflow: "hidden" },
  cap: { height: 8, borderRadius: 7, width: 14 },
  gap: { width: 32, height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: colors.purple, borderStyle: "dashed", marginBottom: 4 },
  day: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, marginTop: 8 },
  todayPill: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: colors.purple },
  todayText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.ink },
});

const s = StyleSheet.create({
  rowCenter: { flexDirection: "row", alignItems: "center" },
  title: { fontFamily: fonts.semibold, fontSize: 22, color: colors.ink },
  h2: { flex: 1, fontFamily: fonts.medium, fontSize: 19, color: colors.ink },
  range: { flexDirection: "row", backgroundColor: colors.tint, borderRadius: 20, padding: 3 },
  rangeItem: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 17 },
  rangeOn: { backgroundColor: colors.purple },
  rangeText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  rangeTextOn: { fontFamily: fonts.semibold, color: colors.ink },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendText: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotDashed: { borderWidth: 1.5, borderColor: colors.purple, borderStyle: "dashed", backgroundColor: "transparent" },
  tile: { backgroundColor: colors.tint, borderRadius: 20, padding: 16, gap: 2 },
  tileLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  tileValue: { fontFamily: fonts.bold, fontSize: 28, color: colors.ink },
  tileSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  ringText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  mindTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  aiBtn: { width: 153, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 11, backgroundColor: colors.pink, flexDirection: "row", gap: 4, alignItems: "center", justifyContent: "center" },
  aiText: { fontFamily: fonts.medium, fontSize: 13.6, color: "#000" },
  summary: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.ink, marginTop: 4 },
});
