// Therapy, from the Figma frames "Therapy", "Therapy · Consent pop-up" and "My sessions".
// Find someone: filters, a day strip, and each professional with her free times that day.
// My sessions: next session, requests waiting for an answer, coming up, past.
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, Consent, Mode, Professional, proInfo, proName, rememberPros, Session, Slot, TimeOfDay } from "../../src/api";
import { useAction, useLoad } from "../../src/hooks";
import { Appear, Button, Card, Chip, ErrorText, Field, Loading, Screen, Tag } from "../../src/ui";
import { Sheet } from "../../src/Sheet";
import { applyPendingShares, ConsentSheet, shareLabel } from "../../src/ConsentSheet";
import { colors, fonts } from "../../src/theme";
import { addDays, dateTimeLabel, dayLabel, dayOfIso, longDateTime, timeLabel, today, weekdayShort } from "../../src/dates";
import { pendingShares, rememberShare, ShareChoice } from "../../src/local";
import { plural, t } from "../../src/i18n";

const TIMES: { key: TimeOfDay | undefined; label: string }[] = [
  { key: undefined, label: "Any time" },
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
];
// Same windows as the backend's time_of_day filter (Algiers hours).
const HOURS: Record<TimeOfDay, [number, number]> = { morning: [5, 12], afternoon: [12, 17], evening: [17, 22] };
const STRIP_DAYS = 14;
const MAX_DAYS = 3; // days of times shown per card when no day is picked
const AVATAR_BG = [colors.lavender, colors.pinkSoft, colors.lilac];

const modeLabel = (m: Mode) => (m === "online" ? t("Online") : t("In person"));
const place = (id: number) => proInfo(id)?.wilaya_name ?? proInfo(id)?.city;
const plain = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** "Sétif" rather than "Sétif, Setif" when the city and the wilaya share a name. */
const placeLine = (p: Professional) =>
  p.wilaya_name && p.city && plain(p.wilaya_name) !== plain(p.city) ? `${p.city}, ${p.wilaya_name}` : p.city || p.wilaya_name || "";

export default function Therapy() {
  const [tab, setTab] = useState<"find" | "mine">("find");
  return (
    <Screen tabs>
      <View style={{ gap: 6, paddingHorizontal: 5 }}>
        <Text style={s.h1}>{t("Therapy")}</Text>
        <Text style={s.intro}>
          {tab === "find" ? t("Book a verified woman psychologist. Booking is free; she accepts or declines your request.") : t("Your requests and sessions in one place.")}
        </Text>
      </View>
      <View style={s.seg}>
        {(["find", "mine"] as const).map((k) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[s.segItem, tab === k && s.segOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
            <Text style={[s.segText, tab === k && s.segTextOn]}>{k === "find" ? t("Find someone") : t("My sessions")}</Text>
          </Pressable>
        ))}
      </View>
      {tab === "find" ? <Find /> : <Mine onFind={() => setTab("find")} />}
    </Screen>
  );
}

// ---------- find someone ----------
function Find() {
  const [mode, setMode] = useState<Mode | undefined>();
  const [wilaya, setWilaya] = useState<string | undefined>();
  const [day, setDay] = useState<string | null>(null); // null = every day in the strip
  const [time, setTime] = useState<TimeOfDay | undefined>();
  const [pick, setPick] = useState(false);
  const [q, setQ] = useState("");
  const wilayas = useLoad(() => api.wilayas());
  const where = mode === "online" ? undefined : wilaya; // a wilaya only narrows in-person care
  const pros = useLoad(async () => {
    const list = await api.professionals({ mode, wilaya: where, from: day ?? today(), to: day ?? addDays(today(), STRIP_DAYS - 1), time_of_day: time, limit: 50 });
    await rememberPros(list);
    return list;
  }, [mode, where, day, time]);
  const wName = wilayas.data?.find((w) => w.code === wilaya)?.name;
  const filtered = useMemo(() => (wilayas.data ?? []).filter((w) => `${w.code} ${w.name}`.toLowerCase().includes(q.toLowerCase())), [wilayas.data, q]);
  const days = useMemo(() => Array.from({ length: STRIP_DAYS }, (_, i) => addDays(today(), i)), []);
  const n = pros.data?.length ?? 0;

  return (
    <>
      <Card color={colors.lilac} style={{ gap: 10 }}>
        <Text style={s.label}>{t("HOW")}</Text>
        <View style={s.wrap}>
          {(["in_person", "online"] as Mode[]).map((m) => (
            <Pill key={m} label={modeLabel(m)} on={mode === m} onPress={() => setMode(mode === m ? undefined : m)} />
          ))}
        </View>
        {mode !== "online" && (
          <>
            <Text style={s.label}>{t("WHERE · FOR IN PERSON")}</Text>
            <Pressable onPress={() => setPick(true)} style={s.select} accessibilityRole="button">
              <Text style={s.selectText}>{wName ?? t("Any wilaya")}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.ink} />
            </Pressable>
          </>
        )}
        <Text style={s.label}>{t("DATE")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -20 }}>
          <View style={{ width: 12 }} />
          <Pressable onPress={() => setDay(null)} style={[s.day, s.dayAll, !day && s.dayOn]} accessibilityRole="button" accessibilityState={{ selected: !day }}>
            <Text style={[s.dayNum, { fontSize: 14 }, !day && { color: colors.white }]}>{t("All days")}</Text>
          </Pressable>
          {days.map((d) => {
            const on = d === day;
            return (
              <Pressable key={d} onPress={() => setDay(on ? null : d)} style={[s.day, on && s.dayOn]} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={dayLabel(d)}>
                <Text style={[s.dayWd, on && { color: colors.white }]}>{weekdayShort(d)}</Text>
                <Text style={[s.dayNum, on && { color: colors.white }]}>{Number(d.slice(8))}</Text>
              </Pressable>
            );
          })}
          <View style={{ width: 12 }} />
        </ScrollView>
        <Text style={s.label}>{t("TIME")}</Text>
        <View style={s.wrap}>
          {TIMES.map((tm) => <Pill key={tm.label} label={t(tm.label)} on={time === tm.key} onPress={() => setTime(tm.key)} />)}
        </View>
      </Card>

      <View style={{ gap: 2, paddingHorizontal: 5 }}>
        <Text style={s.h2}>{pros.data ? plural(n, "{n} woman available", "{n} women available") : t("Looking…")}</Text>
        <Text style={s.small}>{[day ? dayLabel(day) : t("Next 14 days"), mode && modeLabel(mode), mode !== "online" && wName].filter(Boolean).join(" · ")}</Text>
      </View>
      <ErrorText message={pros.error} />
      {pros.loading && !pros.data ? <Loading /> : null}
      {pros.data?.length === 0 && (
        <Card><Text style={s.empty}>{t("No one is free with these filters. Try another day, another time or another wilaya.")}</Text></Card>
      )}
      {pros.data?.map((p, i) => (
        <Appear key={`${p.id}-${day ?? "all"}`}>
          <ProCard p={p} day={day} mode={mode} time={time} tint={AVATAR_BG[i % AVATAR_BG.length]} onBooked={pros.reload} />
        </Appear>
      ))}

      <Sheet visible={pick} title={t("Choose a wilaya")} onClose={() => setPick(false)}>
        <Field value={q} onChangeText={setQ} placeholder={t("Search: Setif, 19…")} autoCorrect={false} />
        <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => { setWilaya(undefined); setPick(false); }} style={s.option}><Text style={s.optionText}>{t("Any wilaya")}</Text></Pressable>
          {filtered.map((w) => (
            <Pressable key={w.code} onPress={() => { setWilaya(w.code); setPick(false); setQ(""); }} style={[s.option, wilaya === w.code && { backgroundColor: colors.lavender }]}>
              <Text style={s.optionText}>{w.code} · {w.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
    </>
  );
}

/** One professional with her free times (on the chosen day, or grouped by day), and Book. */
function ProCard({ p, day, mode, time, tint, onBooked }: { p: Professional; day: string | null; mode?: Mode; time?: TimeOfDay; tint: string; onBooked: () => void }) {
  const router = useRouter();
  const slots = useLoad(() => api.slots(p.id, { mode, limit: 100 }), [p.id, mode]);
  const [picked, setPicked] = useState<Slot | null>(null);
  const [asking, setAsking] = useState(false);
  const book = useAction();

  // Her free times that match the filters, grouped by day (only the picked day when there is one).
  const last = addDays(today(), STRIP_DAYS - 1);
  const daySlots = useMemo(
    () =>
      (slots.data ?? []).filter((x) => {
        const d = dayOfIso(x.starts_at);
        if (day ? d !== day : d > last) return false;
        if (!time) return true;
        const h = Number(timeLabel(x.starts_at).slice(0, 2));
        return h >= HOURS[time][0] && h < HOURS[time][1];
      }),
    [slots.data, day, time, last]
  );
  const groups = useMemo(() => {
    const by = new Map<string, Slot[]>();
    for (const x of daySlots) by.set(dayOfIso(x.starts_at), [...(by.get(dayOfIso(x.starts_at)) ?? []), x]);
    return [...by.entries()];
  }, [daySlots]);
  const shownGroups = day ? groups : groups.slice(0, MAX_DAYS);
  const moreDays = groups.length - shownGroups.length;
  useEffect(() => {
    setPicked((cur) => (cur && daySlots.some((x) => x.id === cur.id) ? cur : daySlots[0] ?? null));
  }, [daySlots]);

  const where = p.modes.map((m) => (m === "in_person" ? `${t("In person")}${p.wilaya_name ? ` · ${p.wilaya_name}` : ""}` : t("Online")));

  async function confirm(items: ShareChoice[]) {
    if (!picked) return;
    const r = await book.run(() => api.book(picked.id));
    if (!r) {
      slots.reload();
      return;
    }
    if (items.length) await rememberShare(r.id, p.id, items);
    setAsking(false);
    onBooked();
    router.push(`/session/${r.id}?new=1`);
  }

  return (
    <Card style={{ gap: 12 }}>
      <Pressable onPress={() => router.push(`/pro/${p.id}`)} style={s.proHead} accessibilityRole="link">
        <View style={[s.initial, { backgroundColor: tint }]}><Text style={s.initialText}>{p.name.replace(/^Dr\.?\s*/i, "").charAt(0)}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.proName} numberOfLines={1}>{p.name}</Text>
          <Text style={s.small} numberOfLines={1}>{placeLine(p)}</Text>
        </View>
      </Pressable>
      {p.bio ? <Text style={s.bio} numberOfLines={2}>{p.bio}</Text> : null}
      <View style={s.wrapTight}>
        <Tag label={t("Verified")} color={colors.lavender} />
        {where.map((w) => <Tag key={w} label={w} />)}
      </View>
      {slots.loading && !slots.data ? (
        <Text style={s.small}>{t("Loading times…")}</Text>
      ) : groups.length ? (
        <>
          {shownGroups.map(([d, list]) => (
            <View key={d} style={{ gap: 8 }}>
              <Text style={s.availTitle}>{t("Available {day}", { day: dayLabel(d) })}</Text>
              <View style={s.wrapTight}>
                {list.map((x) => {
                  const on = picked?.id === x.id;
                  return (
                    <Pressable key={x.id} onPress={() => setPicked(x)} style={[s.slot, on && s.slotOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                      <Text style={[s.slotText, on && { color: colors.white }]}>{timeLabel(x.starts_at)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          {moreDays > 0 && <Text style={s.small}>{plural(moreDays, "+ {n} more day: pick it in the dates above.", "+ {n} more days: pick one in the dates above.")}</Text>}
        </>
      ) : (
        <Text style={s.small}>{day ? t("No free times left that day.") : t("No free times in the next 14 days.")}</Text>
      )}
      <Button title={t("Book")} height={52} disabled={!picked} onPress={() => { book.setError(null); setAsking(true); }} textStyle={{ fontSize: 15 }} />
      <ConsentSheet
        visible={asking}
        who={p.name}
        summary={picked ? `${p.name} · ${dayLabel(dayOfIso(picked.starts_at))}, ${timeLabel(picked.starts_at)} · ${modeLabel(picked.mode)}` : p.name}
        busy={book.busy}
        error={book.error}
        onConfirm={confirm}
        onClose={() => setAsking(false)}
      />
    </Card>
  );
}

function Pill({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.pill, on && s.pillOn]} accessibilityRole="button" accessibilityState={{ selected: !!on }}>
      <Text style={[s.pillText, on && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

// ---------- my sessions ----------
function Mine({ onFind }: { onFind: () => void }) {
  const router = useRouter();
  const act = useAction();
  const [allPast, setAllPast] = useState(false);
  const [pending, setPending] = useState<Record<string, ShareChoice[]>>({});
  const [granted, setGranted] = useState<Consent[]>([]);
  // Send choices kept from booking first, so the "Sharing" labels read what was really sent.
  const q = useLoad(async () => {
    const list = await api.sessions();
    await applyPendingShares(list);
    const [p, c] = await Promise.all([pendingShares(), api.consents()]);
    setPending(Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.items])));
    setGranted(c);
    return list;
  });

  const now = new Date().toISOString();
  const all = q.data ?? [];
  const upcoming = all.filter((x) => x.status === "accepted" && x.starts_at >= now).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const next = upcoming[0];
  const coming = upcoming.slice(1);
  const waiting = all.filter((x) => x.status === "requested" && x.starts_at >= now).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = all.filter((x) => !upcoming.includes(x) && !waiting.includes(x)).sort((a, b) => b.starts_at.localeCompare(a.starts_at));

  const sharing = (x: Session) => {
    if (x.status === "requested") return shareLabel(pending[x.id] ?? []);
    return shareLabel(granted.filter((c) => c.professional === x.professional).map((c) => c.category));
  };
  const whereTag = (x: Session) => (x.mode === "online" ? t("Online") : `${t("In person")}${place(x.professional) ? ` · ${place(x.professional)}` : ""}`);
  const cancel = async (x: Session) => {
    const r = await act.run(() => api.cancelSession(x.id));
    if (r) q.reload();
  };

  if (q.loading && !q.data) return <Loading cards={2} />;
  return (
    <>
      <ErrorText message={q.error ?? act.error} />
      {all.length === 0 && (
        <Card style={{ gap: 12 }}>
          <Text style={s.empty}>{t("No sessions yet. When you book one, it appears here.")}</Text>
          <Button title={t("Find someone")} onPress={onFind} />
        </Card>
      )}

      {next && (
        <Appear>
          <Card color={colors.lavender} style={{ gap: 8 }}>
            <Text style={s.eyebrow}>{t("YOUR NEXT SESSION")}</Text>
            <Text style={s.nextName}>{proName(next.professional)} · {modeLabel(next.mode)}</Text>
            <Text style={s.nextWhen}>{longDateTime(next.starts_at)}</Text>
            <View style={s.wrapTight}>
              <Tag label={t("Accepted")} color={colors.white} />
              <Tag label={t("Sharing: {what}", { what: sharing(next) })} />
            </View>
            <Text style={s.note}>
              {next.mode === "online" ? t("The video link opens 30 minutes before.") : next.professional_address ? next.professional_address : t("The address is on the session page.")}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <Button title={t("Details")} kind="white" style={{ flex: 1 }} onPress={() => router.push(`/session/${next.id}`)} />
              <Button title={t("Cancel session")} kind="outline" style={{ flex: 1, backgroundColor: "transparent" }} textStyle={{ color: colors.purple }} loading={act.busy} onPress={() => cancel(next)} />
            </View>
          </Card>
        </Appear>
      )}

      {waiting.length > 0 && (
        <Card style={{ gap: 12 }}>
          <Text style={s.section}>{t("Waiting for an answer")}</Text>
          {waiting.map((x) => (
            <View key={x.id} style={s.item}>
              <ItemHead x={x} tag={t("Pending")} color={colors.pinkSoft} />
              <Text style={s.itemText}>{t("She accepts or declines your request. You will see her answer here.")}</Text>
              <View style={s.wrapTight}>
                <Tag label={whereTag(x)} />
                <Tag label={t("Sharing: {what}", { what: sharing(x) })} />
              </View>
              <Button title={t("Cancel request")} kind="outline" onPress={() => cancel(x)} disabled={act.busy} />
            </View>
          ))}
        </Card>
      )}

      {coming.length > 0 && (
        <Card style={{ gap: 12 }}>
          <Text style={s.section}>{t("Coming up")}</Text>
          {coming.map((x) => (
            <View key={x.id} style={s.item}>
              <ItemHead x={x} tag={t("Accepted")} color={colors.lavender} />
              <View style={s.wrapTight}>
                <Tag label={whereTag(x)} />
                <Tag label={t("Sharing: {what}", { what: sharing(x) })} />
              </View>
              <Button title={t("Details")} kind="outline" onPress={() => router.push(`/session/${x.id}`)} />
            </View>
          ))}
        </Card>
      )}

      {past.length > 0 && (
        <Card style={{ gap: 12 }}>
          <View style={s.rowCenter}>
            <Text style={[s.section, { flex: 1 }]}>{t("Past sessions")}</Text>
            {past.length > 2 && (
              <Pressable onPress={() => setAllPast(!allPast)} hitSlop={10} accessibilityRole="button">
                <Text style={s.link}>{allPast ? t("Show less") : t("See all")}</Text>
              </Pressable>
            )}
          </View>
          {(allPast ? past : past.slice(0, 2)).map((x, i) => {
            const done = x.status !== "declined" && x.status !== "cancelled" && x.status !== "requested";
            const label = x.status === "declined" ? t("Declined") : x.status === "cancelled" ? t("Cancelled") : x.status === "requested" ? t("No answer") : t("Done");
            return (
              <Pressable key={x.id} onPress={() => router.push(`/session/${x.id}`)} style={s.item}>
                <ItemHead x={x} tag={label} color={done ? colors.lilac : colors.tint} />
                <View style={s.wrapTight}><Tag label={modeLabel(x.mode)} /></View>
                {i === 0 && <Button title={t("Book again")} kind="outline" onPress={() => router.push(`/pro/${x.professional}`)} />}
              </Pressable>
            );
          })}
        </Card>
      )}
    </>
  );
}

function ItemHead({ x, tag, color }: { x: Session; tag: string; color: string }) {
  return (
    <View style={[s.rowCenter, { alignItems: "flex-start" }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.itemName}>{proName(x.professional)}</Text>
        <Text style={s.small}>{dateTimeLabel(x.starts_at)}</Text>
      </View>
      <Tag label={tag} color={color} />
    </View>
  );
}

const s = StyleSheet.create({
  h1: { fontFamily: fonts.semibold, fontSize: 28, color: colors.ink },
  h2: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  intro: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.muted },
  seg: { flexDirection: "row", backgroundColor: colors.white, borderRadius: 24, padding: 4 },
  segItem: { flex: 1, height: 44, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: colors.purple },
  segText: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  segTextOn: { fontFamily: fonts.semibold, color: colors.ink },
  label: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.88, color: colors.muted },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  wrapTight: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  pill: { height: 38, paddingHorizontal: 16, borderRadius: 19, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  pillOn: { backgroundColor: colors.purple },
  pillText: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  select: { height: 48, borderRadius: 20, backgroundColor: colors.white, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  day: { width: 56, height: 62, borderRadius: 14, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", gap: 2 },
  dayOn: { backgroundColor: colors.purple },
  dayAll: { width: undefined, paddingHorizontal: 14 },
  dayWd: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink },
  dayNum: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  empty: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.muted },
  proHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  initial: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  initialText: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  proName: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  bio: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.ink },
  availTitle: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink },
  slot: { minWidth: 64, height: 38, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.purple, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  slotOn: { backgroundColor: colors.purple },
  slotText: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  option: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14 },
  optionText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.88, color: colors.ink },
  nextName: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  nextWhen: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  note: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  section: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  item: { backgroundColor: colors.tint, borderRadius: 20, padding: 16, gap: 10 },
  itemName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  itemText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted },
});
