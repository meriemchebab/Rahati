// One topic of the library (Figma "Library · Topic · Sleep"); "all" lists every card.
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Appear, ErrorText, Loading, Screen, SectionHeader } from "../../src/ui";
import { GENERAL, LibraryCard, TopicGrid, TopicGridSkeleton, topicOf, useLibrary } from "../../src/Library";
import { colors, fonts, topicLabel } from "../../src/theme";
import { mirror, plural, t } from "../../src/i18n";

type Filter = "all" | "new" | "read";

export default function TopicPage() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { all, topics, reload } = useLibrary();
  const [filter, setFilter] = useState<Filter>("all");

  const everything = code === "all";
  const name = everything ? t("All cards") : code === GENERAL ? t("General") : topicLabel(code, topics.data?.find((x) => x.code === code)?.name);
  const mine = (all.data ?? []).filter((c) => everything || topicOf(c) === code);
  const read = mine.filter((c) => c.read).length;
  const shown = mine.filter((c) => filter === "all" || (filter === "read" ? c.read : !c.read));

  return (
    <Screen refreshing={all.refreshing} onRefresh={reload}>
      <View style={{ gap: 6 }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/library"))} style={s.back} accessibilityRole="button" hitSlop={8}>
          <Ionicons style={mirror()} name="chevron-back" size={20} color={colors.ink} />
          <Text style={s.backText}>{t("Library")}</Text>
        </Pressable>
        <Text style={s.h1}>{name}</Text>
        <Text style={s.small}>{all.data ? `${plural(mine.length, "{n} card", "{n} cards")} · ${t("{n} read", { n: read })}` : " "}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["all", "new", "read"] as Filter[]).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[s.pill, filter === f && s.pillOn]} accessibilityRole="button" accessibilityState={{ selected: filter === f }}>
            <Text style={[s.pillText, filter === f && { color: colors.white }]}>{f === "all" ? t("All") : f === "new" ? t("New") : t("Read")}</Text>
          </Pressable>
        ))}
      </View>

      <ErrorText message={all.error} />
      {all.loading && !all.data ? <Loading cards={2} /> : null}
      {all.data && shown.length === 0 && (
        <Text style={s.empty}>{filter === "read" ? t("Nothing read here yet.") : filter === "new" ? t("You have read everything here.") : t("No cards for this topic yet.")}</Text>
      )}
      {shown.map((c) => (
        <Appear key={c.id}><LibraryCard card={c} onChange={all.reload} /></Appear>
      ))}

      <View style={{ gap: 12, marginTop: 8 }}>
        <SectionHeader title={t("Browse by topic")} size={19} link={everything ? undefined : t("All cards")} onLink={() => router.replace("/topic/all")} />
        {all.data && topics.data ? <TopicGrid cards={all.data} topics={topics.data} current={code} /> : <TopicGridSkeleton />}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start", marginLeft: -4 },
  backText: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  h1: { fontFamily: fonts.semibold, fontSize: 28, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, paddingHorizontal: 5 },
  pill: { height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  pillOn: { backgroundColor: colors.purple },
  pillText: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
});
