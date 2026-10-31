import { useState } from "react";
import { Linking, StyleSheet, Switch, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api, ConsentCategory, proName } from "../../src/api";
import { useAction, useLoad } from "../../src/hooks";
import { Button, Card, ErrorText, Loading, Notice, Screen, Tag, TopBar } from "../../src/ui";
import { colors, fonts } from "../../src/theme";
import { longDateTime } from "../../src/dates";
import { applyPendingShares } from "../../src/ConsentSheet";
import { pendingShares, rememberShare, ShareChoice } from "../../src/local";
import { t } from "../../src/i18n";

const SHARE: { key: ConsentCategory; label: string; hint: string }[] = [
  { key: "mood", label: "Mood and energy", hint: "Your daily check-in numbers." },
  { key: "journal", label: "Journal", hint: "What you write in your journal." },
  { key: "cycle", label: "Cycle", hint: "The days your period started." },
];
const STATUS: Record<string, { label: string; color: string }> = {
  requested: { label: "Waiting for reply", color: colors.lilac },
  accepted: { label: "Accepted", color: "#C8FDF7" },
  completed: { label: "Completed", color: colors.tint },
  declined: { label: "Declined", color: colors.dangerSoft },
  cancelled: { label: "Cancelled", color: colors.tint },
};

export default function SessionDetail() {
  const { id, new: isNew } = useLocalSearchParams<{ id: string; new?: string }>();
  const sid = Number(id);
  const [pending, setPending] = useState<ShareChoice[]>([]);
  // Choices ticked at booking wait on the phone until she accepts, then they are sent.
  const q = useLoad(async () => {
    const x = await api.session(sid);
    await applyPendingShares([x]);
    setPending((await pendingShares())[sid]?.items ?? []);
    return x;
  }, [sid]);
  const consents = useLoad(() => api.consents(), [q.data?.status]);
  const act = useAction();
  const s0 = q.data;

  if (!s0) {
    return (
      <Screen>
        <TopBar title={t("Session")} />
        {q.loading ? <Loading cards={1} /> : <ErrorText message={q.error ?? t("This session wasn't found.")} />}
      </Screen>
    );
  }
  const online = s0.mode === "online";
  const st = STATUS[s0.status] ?? STATUS.cancelled;
  const canShare = s0.status === "accepted" || s0.status === "completed";
  const waiting = s0.status === "requested";
  const active = (c: ConsentCategory) =>
    waiting ? pending.includes(c) : !!consents.data?.some((x) => x.professional === s0.professional && x.category === c);
  async function toggle(c: ConsentCategory, v: boolean) {
    if (waiting) {
      const next = v ? [...pending, c] : pending.filter((x) => x !== c);
      await rememberShare(sid, s0!.professional, next);
      setPending(next);
      return;
    }
    const r = await act.run(() => api.setConsent(s0!.professional, c, v));
    if (r) consents.reload();
  }
  const start = new Date(s0.starts_at).getTime();
  const linkOpen = !!s0.meeting_link && Date.now() > start - 30 * 60000;

  return (
    <Screen refreshing={q.refreshing} onRefresh={() => { q.reload(); consents.reload(); }}>
      <TopBar title={t("Session")} />
      <Notice message={isNew ? t("Request sent. You'll see here when she accepts.") : null} />
      <Card color={colors.lavender} style={{ gap: 8 }}>
        <Tag label={t(st.label)} color={st.color} />
        <Text style={s.name}>{proName(s0.professional)}</Text>
        <Text style={s.when}>{longDateTime(s0.starts_at)}</Text>
        <Text style={s.when}>{online ? t("Online") : t("In person")}</Text>
        {s0.status === "accepted" && online && (
          s0.meeting_link ? (
            linkOpen ? (
              <Button title={t("Join the video call")} kind="white" onPress={() => Linking.openURL(s0.meeting_link!)} />
            ) : (
              <Text style={s.note}>{t("The video link opens 30 minutes before.")}</Text>
            )
          ) : (
            <Text style={s.note}>{t("She hasn’t added the video link yet.")}</Text>
          )
        )}
        {s0.status === "accepted" && !online && (
          <View style={s.address}>
            <Text style={s.eyebrow}>{t("ADDRESS")}</Text>
            <Text style={s.body}>{s0.professional_address || t("Not shared yet.")}</Text>
          </View>
        )}
        {s0.status === "requested" && <Text style={s.note}>{online ? t("Your video link appears once she accepts.") : t("The address is shown once she accepts.")}</Text>}
      </Card>

      <Card style={{ gap: 12 }}>
        <Text style={s.h2}>{t("What she can see")}</Text>
        <Text style={s.small}>{canShare ? t("Nothing is shared unless you turn it on. You can turn it off anytime.") : waiting ? t("What you turn on is sent to her only once she accepts your session.") : t("Nothing is shared for this session.")}</Text>
        {SHARE.map((c) => (
          <View key={c.key} style={s.shareRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.shareTitle}>{t(c.label)}</Text>
              <Text style={s.small}>{t(c.hint)}</Text>
            </View>
            <Switch
              value={active(c.key)}
              disabled={!(canShare || waiting) || act.busy}
              onValueChange={(v) => toggle(c.key, v)}
              trackColor={{ true: colors.purple, false: colors.lilac }}
              thumbColor={colors.white}
            />
          </View>
        ))}
        <ErrorText message={act.error} />
      </Card>

      {(s0.status === "requested" || s0.status === "accepted") && (
        <Button title={t("Cancel session")} kind="outline" loading={act.busy} onPress={async () => { const r = await act.run(() => api.cancelSession(s0.id)); if (r) q.reload(); }} />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  name: { fontFamily: fonts.semibold, fontSize: 22, color: colors.ink },
  when: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  note: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  address: { backgroundColor: colors.white, borderRadius: 18, padding: 14, gap: 4 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.88, color: colors.muted },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.ink },
  h2: { fontFamily: fonts.semibold, fontSize: 19, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  shareRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.tint, borderRadius: 18, padding: 14 },
  shareTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
});
