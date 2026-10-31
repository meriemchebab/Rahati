// Library home (Figma "Library"): lessons picked for her, then every topic.
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../src/api";
import { useLoad } from "../src/hooks";
import { Appear, ErrorText, Loading, Screen, SectionHeader } from "../src/ui";
import { LibraryCard, TopicGrid, TopicGridSkeleton, useLibrary } from "../src/Library";
import { colors, fonts, topicLabel } from "../src/theme";
import { addDays, today } from "../src/dates";
import { mirror, plural, t } from "../src/i18n";

export default function Library() {
  const router = useRouter();
  const { all, topics, reload } = useLibrary();
  const forYou = useLoad(() => api.cards());
  const checkIns = useLoad(() => api.checkIns());

  // The suggestions follow the topics she tagged at check-in over the last 14 days.
  const tagged = useMemo(() => {
    const since = addDays(today(), -13);
    const counts = new Map<string, number>();
    for (const c of checkIns.data ?? []) if (c.checkin_date >= since) for (const t of c.topics ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([code]) => topicLabel(code));
  }, [checkIns.data]);
  const read = (all.data ?? []).filter((c) => c.read).length;

  return (
    <Screen refreshing={all.refreshing} onRefresh={() => { reload(); forYou.reload(); }}>
      <View style={{ gap: 4 }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))} style={s.back} accessibilityRole="button" accessibilityLabel={t("Back")} hitSlop={8}>
          <Ionicons style={mirror()} name="chevron-back" size={28} color={colors.ink} />
          <Text style={s.h1}>{t("Library")}</Text>
        </Pressable>
        <Text style={s.intro}>{t("Short lessons, at your own pace.")}</Text>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ gap: 2 }}>
          <SectionHeader title={t("For you")} size={19} />
          <Text style={s.small}>
            {tagged.length ? t("Because you tagged {topics} in the last 14 days.", { topics: tagged.join(t(" and ")) }) : t("Tag topics when you check in, and lessons for them show up here.")}
          </Text>
        </View>
        <ErrorText message={forYou.error} />
        {forYou.loading && !forYou.data ? <Loading cards={2} /> : null}
        {(forYou.data ?? []).map((c) => (
          <Appear key={c.id}><LibraryCard card={c} onChange={forYou.reload} /></Appear>
        ))}
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeader title={t("Browse by topic")} size={19} link={t("All cards")} onLink={() => router.push("/topic/all")} />
        <ErrorText message={all.error ?? topics.error} />
        {all.data && topics.data ? <Appear><TopicGrid cards={all.data} topics={topics.data} /></Appear> : <TopicGridSkeleton />}
        {all.data ? (
          <Text style={[s.small, { textAlign: "center", marginTop: 6 }]}>
            {read ? t("You have read {read} of {n} cards.", { read, n: all.data.length }) : plural(all.data.length, "{n} card to explore.", "{n} cards to explore.")}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginLeft: -6 },
  h1: { fontFamily: fonts.semibold, fontSize: 28, color: colors.ink },
  intro: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  small: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
});
