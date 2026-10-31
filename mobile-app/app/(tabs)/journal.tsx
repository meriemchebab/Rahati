import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../../src/api";
import { useAction, useLoad } from "../../src/hooks";
import { Appear, Button, Card, ErrorText, Notice, Screen, SectionHeader, SkeletonLines, Tag } from "../../src/ui";
import { colors, fonts, topicLabel } from "../../src/theme";
import { entryStamp, today } from "../../src/dates";
import { t } from "../../src/i18n";

export default function Journal() {
  const entries = useLoad(() => api.journal());
  const checkIns = useLoad(() => api.checkIns());
  const [body, setBody] = useState("");
  const [link, setLink] = useState(true);
  const [all, setAll] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const save = useAction();

  const byId = useMemo(() => new Map((checkIns.data ?? []).map((c) => [c.id, c])), [checkIns.data]);
  const todayRow = checkIns.data?.find((c) => c.checkin_date === today());
  const list = entries.data ?? [];
  const shown = all ? list : list.slice(0, 3);

  const submit = async () => {
    setMsg(null);
    const r = await save.run(() => api.addJournal({ body: body.trim(), check_in: link && todayRow ? todayRow.id : null }));
    if (r) {
      setBody("");
      entries.setData([r, ...list]);
      setMsg(t("Saved. Only you can read it."));
    }
  };

  return (
    <Screen tabs refreshing={entries.refreshing} onRefresh={() => { entries.reload(); checkIns.reload(); }}>
      <View style={{ gap: 6, paddingHorizontal: 5 }}>
        <Text style={s.h1}>{t("Journal")}</Text>
        <Text style={s.intro}>{t("Only you can read this. It’s encrypted before it’s stored, and a professional sees it only if you allow it.")}</Text>
      </View>

      <Card color={colors.lilac} style={{ gap: 12 }}>
        <Text style={s.eyebrow}>{t("WRITE IT DOWN")}</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={20000}
          placeholder={t("What is on your mind today? Write as much or as little as you like.")}
          placeholderTextColor={colors.placeholder}
          style={s.field}
        />
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: link && !!todayRow }}
          onPress={() => setLink(!link)}
          disabled={!todayRow}
          style={[s.link, link && todayRow ? s.linkOn : null, !todayRow && { opacity: 0.6 }]}
        >
          <Text style={s.linkText}>{todayRow ? (link ? t("✓ Linked to today’s check-in") : t("Link to today’s check-in")) : t("Check in today to link it")}</Text>
        </Pressable>
        <ErrorText message={save.error} />
        <Notice message={msg} />
        <Button title={t("Save entry")} height={52} onPress={submit} loading={save.busy} disabled={!body.trim()} textStyle={{ fontSize: 15 }} />
        <Text style={s.foot}>{t("Encrypted before it is stored. Only you can read it.")}</Text>
      </Card>

      <Card style={{ gap: 12 }}>
        <SectionHeader title={t("Your earlier entries")} link={list.length > 3 ? (all ? t("Show less") : t("See all")) : undefined} onLink={() => setAll(!all)} />
        <Text style={s.count}>{!entries.data ? t("Loading your entries…") : list.length ? t("{shown} of {total} entries · newest first", { shown: shown.length, total: list.length }) : t("No entries yet. Even one line counts.")}</Text>
        <ErrorText message={entries.error} />
        {entries.loading && !entries.data ? <SkeletonLines /> : null}
        {shown.map((e) => {
          const ci = e.check_in ? byId.get(e.check_in) : undefined;
          return (
            <Appear key={e.id} style={s.entry}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={s.stamp}>{entryStamp(e.created_at)}</Text>
                {ci && <View style={s.mood}><Text style={s.moodText}>{t("Mood {n}", { n: ci.mood })}</Text></View>}
              </View>
              <Text style={s.body}>{e.body}</Text>
              {ci && ci.topics?.length ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {ci.topics.map((code) => <Tag key={code} label={topicLabel(code)} />)}
                </View>
              ) : null}
            </Appear>
          );
        })}
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  h1: { fontFamily: fonts.semibold, fontSize: 28, color: colors.ink },
  intro: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.muted },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.88, color: colors.muted },
  field: { minHeight: 132, backgroundColor: colors.white, borderRadius: 20, padding: 16, paddingTop: 16, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.ink, textAlignVertical: "top" },
  link: { alignSelf: "flex-start", backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1.5, borderColor: colors.white },
  linkOn: { borderColor: colors.purple },
  linkText: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  foot: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, textAlign: "center" },
  count: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  entry: { backgroundColor: colors.tint, borderRadius: 20, padding: 16, gap: 8 },
  stamp: { flex: 1, fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.66, color: colors.muted },
  mood: { backgroundColor: colors.lavender, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  moodText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.ink },
});
