// "How are you today?" + "What is on your mind?" from the Home design.
// One check-in per day: saving again the same day updates it.
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api, CheckIn as CheckInT, Topic } from "../api";
import { useAction } from "../hooks";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, ErrorText, Icon, Notice } from "../ui";
import { colors, fonts, moods, topicLabel, topicLabels } from "../theme";
import { today } from "../dates";
import { t } from "../i18n";

const MAX_TOPICS = 3;
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

// Same order as the design; unknown codes go last.
const order = (code: string) => {
  const i = Object.keys(topicLabels).indexOf(code);
  return i < 0 ? 99 : i;
};

export function CheckInCard({ todayRow, topics, onSaved }: { todayRow?: CheckInT; topics: Topic[]; onSaved: (c: CheckInT) => void }) {
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const save = useAction();
  const saveTopics = useAction();

  useEffect(() => {
    if (todayRow) {
      setMood(todayRow.mood);
      setEnergy(todayRow.energy);
      setPicked((p) => (sameSet(p, todayRow.topics ?? []) ? p : todayRow.topics ?? []));
    }
  }, [todayRow]);

  const submit = async () => {
    if (!mood || !energy) return;
    setMsg(null);
    const r = await save.run(() => api.checkIn({ checkin_date: today(), mood, energy, topics: picked }));
    if (r) {
      onSaved(r);
      setMsg(todayRow ? t("Today's check-in updated.") : t("Checked in. Thank you for pausing."));
    }
  };

  const toggleTopic = (code: string) =>
    setPicked((p) => (p.includes(code) ? p.filter((c) => c !== code) : p.length >= MAX_TOPICS ? p : [...p, code]));

  // Topics save by themselves a moment after the last tap (they live on today's check-in).
  const [topicState, setTopicState] = useState<"idle" | "saving" | "saved" | "pending">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!todayRow) {
      setTopicState(picked.length ? "pending" : "idle");
      return;
    }
    if (sameSet(picked, todayRow.topics ?? [])) {
      // Already stored (e.g. they went in with the check-in itself).
      setTopicState((st) => (st === "pending" || st === "saving" ? "saved" : st));
      return;
    }
    setTopicState("saving");
    timer.current = setTimeout(async () => {
      const r = await saveTopics.run(() => api.checkIn({ checkin_date: today(), mood: todayRow.mood, energy: todayRow.energy, topics: picked }));
      setTopicState(r ? "saved" : "idle");
      if (r) onSaved(r);
    }, 700);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, todayRow]);

  return (
    <>
      <Card style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          <Text style={s.title}>{t("How are you today?")}</Text>
          <Text style={s.sub}>{t("20 seconds. Only you see this unless you share it.")}</Text>
        </View>
        <Text style={s.label}>{t("Mood")}</Text>
        <View style={s.moods}>
          {moods.map((m) => {
            const on = mood === m.value;
            return (
              <Pressable
                key={m.value}
                accessibilityRole="button"
                accessibilityLabel={t(m.label)}
                accessibilityState={{ selected: on }}
                onPress={() => setMood(m.value)}
                style={[s.moodCard, { backgroundColor: m.bg }, on && s.moodOn, mood !== null && !on && { opacity: 0.55 }]}
              >
                <Icon name={m.svg} width={30} height={34} />
                <Text style={s.moodLabel}>{t(m.label)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={s.label}>{t("Energy")}</Text>
        <View style={s.energy}>
          {[1, 2, 3, 4, 5].map((v) => {
            const on = energy !== null && v <= energy;
            return (
              <Pressable
                key={v}
                accessibilityRole="button"
                accessibilityLabel={t("Energy {v} of 5", { v })}
                accessibilityState={{ selected: energy === v }}
                onPress={() => setEnergy(v)}
                style={[s.energyBox, on ? s.energyOn : null]}
              >
                <Text style={s.energyText}>{v}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={s.ends}>
          <Text style={s.sub}>{t("Drained")}</Text>
          <Text style={s.sub}>{t("Energized")}</Text>
        </View>
        <ErrorText message={save.error} />
        <Notice message={msg} />
        <Button title={todayRow ? t("Update check-in") : t("Check in")} kind="soft" height={52} onPress={submit} loading={save.busy} disabled={!mood || !energy} textStyle={{ fontSize: 15 }} />
      </Card>

      <Card style={{ gap: 12, paddingLeft: 23 }}>
        <View style={s.mindHead}>
          <Text style={s.mindTitle}>{t("What is on your mind?")}</Text>
          <Text style={s.sub}>{t("Optional, up to 3")}</Text>
        </View>
        <View style={s.status}>
          {topicState === "saving" && <View style={[s.badge, s.badgeSoft]}><Text style={[s.badgeText, { color: colors.muted }]}>{t("Saving…")}</Text></View>}
          {topicState === "saved" && (
            <View style={[s.badge, s.badgeOk]}>
              <Ionicons name="checkmark" size={14} color={colors.ok} />
              <Text style={[s.badgeText, { color: colors.ok }]}>{t("Saved")}</Text>
            </View>
          )}
          {topicState === "pending" && <View style={[s.badge, s.badgeSoft]}><Text style={[s.badgeText, { color: colors.muted }]}>{t("Saves with your check-in")}</Text></View>}
          {picked.length > 0 && (
            <View style={[s.badge, s.badgeCount]}>
              <Text style={[s.badgeText, { color: colors.purpleDeep }]}>{picked.length} of {MAX_TOPICS} selected</Text>
            </View>
          )}
        </View>
        <View style={s.topics}>
          {[...topics].sort((a, b) => order(a.code) - order(b.code)).map((tp) => {
            const on = picked.includes(tp.code);
            const full = !on && picked.length >= MAX_TOPICS;
            return (
              <Pressable
                key={tp.code}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on, disabled: full }}
                onPress={() => toggleTopic(tp.code)}
                disabled={full}
                style={({ pressed }) => [s.topic, on && s.topicOn, full && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
              >
                <Text style={[s.topicText, on && s.topicTextOn]}>{topicLabel(tp.code, tp.name)}</Text>
              </Pressable>
            );
          })}
        </View>
        <ErrorText message={saveTopics.error} />
      </Card>
    </>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: fonts.semibold, fontSize: 19, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  moods: { flexDirection: "row", justifyContent: "space-between" },
  moodCard: { width: 52, height: 70, borderRadius: 9, alignItems: "center", paddingTop: 13, gap: 2, borderWidth: 2, borderColor: "transparent" },
  moodOn: { borderColor: colors.purple, transform: [{ scale: 1.06 }] },
  moodLabel: { fontFamily: fonts.medium, fontSize: 8.2, letterSpacing: 0.16, color: "#000" },
  energy: { flexDirection: "row", gap: 8 },
  energyBox: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: colors.chipLine, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  energyOn: { backgroundColor: colors.purple, borderColor: colors.purpleDeep },
  energyText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  ends: { flexDirection: "row", justifyContent: "space-between" },
  mindHead: { flexDirection: "row", alignItems: "baseline", gap: 6, flexWrap: "wrap" },
  mindTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  topics: { flexDirection: "row", flexWrap: "wrap", columnGap: 8, rowGap: 7 },
  status: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, height: 26, paddingHorizontal: 10, borderRadius: 13 },
  badgeOk: { backgroundColor: colors.okSoft },
  badgeSoft: { backgroundColor: colors.tint },
  badgeCount: { backgroundColor: colors.tint },
  badgeText: { fontFamily: fonts.semibold, fontSize: 12 },
  topic: { height: 40, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: colors.chipLine, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  topicOn: { backgroundColor: colors.purple, borderColor: colors.purple },
  topicText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  topicTextOn: { fontFamily: fonts.semibold, color: colors.white },
});
