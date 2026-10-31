import { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { api, proInfo, proName, rememberPros } from "../../src/api";
import { useAuth } from "../../src/auth";
import { useLoad } from "../../src/hooks";
import { Appear, Bone, Card, ErrorText, Screen, SectionHeader, Skeleton } from "../../src/ui";
import { Header } from "../../src/home/Header";
import { NextSession, nextSession } from "../../src/home/NextSession";
import { CheckInCard } from "../../src/home/CheckIn";
import { CycleCard } from "../../src/home/Cycle";
import { SmallActions } from "../../src/home/SmallActions";
import { WeekInWords } from "../../src/home/WeekInWords";
import { LearnCard } from "../../src/LearnCard";
import { applyPendingShares } from "../../src/ConsentSheet";
import { today } from "../../src/dates";
import { t } from "../../src/i18n";

// The summary may call Gemini on the server: ask once per day, not on every visit.
let summaryCache: { day: string; text: string; count: number } | null = null;
async function weeklySummary() {
  if (summaryCache?.day === today()) return summaryCache;
  const r = await api.summary(7);
  summaryCache = { day: today(), text: r.summary, count: r.analytics.check_in_count };
  return summaryCache;
}

export default function Home() {
  const router = useRouter();
  const { me } = useAuth();
  const checkIns = useLoad(() => api.checkIns());
  const topics = useLoad(() => api.topics());
  const todos = useLoad(() => api.todos());
  const sessions = useLoad(async () => {
    const list = await api.sessions();
    // Sessions only carry the professional's id: look names up in the directory once.
    if (list.some((x) => !proInfo(x.professional))) {
      try {
        await rememberPros(await api.professionals({ limit: 50 }));
      } catch {
        /* directory unavailable: the card shows a fallback name */
      }
    }
    await applyPendingShares(list);
    return list;
  });
  const summary = useLoad(() => weeklySummary());
  const cards = useLoad(async () => {
    const suggested = await api.cards();
    return suggested.length ? suggested : (await api.library({ limit: 6 })).results;
  });

  const todayRow = useMemo(() => checkIns.data?.find((c) => c.checkin_date === today()), [checkIns.data]);
  const next = nextSession(sessions.data);
  const reloadAll = () => { checkIns.reload(); todos.reload(); sessions.reload(); cards.reload(); };

  return (
    <Screen tabs refreshing={checkIns.refreshing} onRefresh={reloadAll}>
      <Header nickname={me?.nickname ?? ""} />
      {next && <NextSession session={next} />}
      <ErrorText message={checkIns.error} />
      <CheckInCard
        todayRow={todayRow}
        topics={topics.data ?? []}
        onSaved={(r) => {
          checkIns.setData([r, ...(checkIns.data ?? []).filter((c) => c.checkin_date !== r.checkin_date)]);
          summaryCache = null;
          summary.reload();
          cards.reload();
        }}
      />
      <CycleCard professional={next ? proName(next.professional) : null} />
      <SmallActions todos={todos.data ?? []} onChange={todos.reload} />
      <WeekInWords summary={summary.data?.text ?? null} checkIns={summary.data?.count ?? 0} loading={!summary.data && summary.loading} />
      <View style={{ gap: 12 }}>
        <SectionHeader title={t("Learn something")} size={19} link={t("Browse all")} onLink={() => router.push("/library")} />
        <ErrorText message={cards.error} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }} style={{ marginRight: -16 }}>
          {!cards.data && cards.loading
            ? [0, 1].map((i) => <LearnSkeleton key={i} />)
            : (cards.data ?? []).map((c) => (
                <Appear key={c.id}><LearnCard card={c} /></Appear>
              ))}
        </ScrollView>
      </View>
    </Screen>
  );
}

// Same size as a learn card, shown while the suggestions load.
function LearnSkeleton() {
  return (
    <Skeleton style={{ width: 288 }}>
      <Card style={{ gap: 10 }}>
        <Bone w={90} h={24} r={12} />
        <Bone w="80%" h={16} />
        <Bone w="100%" />
        <Bone w="95%" />
        <Bone w="70%" />
        <Bone w="45%" h={10} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Bone w="48%" h={40} r={20} />
          <Bone w="48%" h={40} r={20} />
        </View>
      </Card>
    </Skeleton>
  );
}
