// Library pieces from the Figma frames "Library" and "Library · Topic": the lesson card
// (New / Read, Open / Add to my to-dos) and the "Browse by topic" grid.
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api, Card as CardT, Page, Topic } from "./api";
import { useAction, useLoad } from "./hooks";
import { Bone, Button, Card, Skeleton, Tag } from "./ui";
import { colors, fonts, topicLabel } from "./theme";
import { plural, t } from "./i18n";

export const readMinutes = (body: string) => Math.max(1, Math.round(body.split(/\s+/).length / 180));
export const GENERAL = "general";
export const topicOf = (c: CardT) => c.topic ?? GENERAL;

/** Every library card once (the library is small), plus the topic names. */
export function useLibrary() {
  const all = useLoad(async () => {
    const page: Page<CardT> = await api.library({ limit: 200 });
    return page.results;
  });
  const topics = useLoad(() => api.topics());
  return { all, topics, reload: () => { all.reload(); topics.reload(); } };
}

/** Lesson card: topic, New / Read, title, preview, then Open + Add to my to-dos. */
export function LibraryCard({ card, onChange }: { card: CardT; onChange?: () => void }) {
  const router = useRouter();
  const add = useAction();
  const [added, setAdded] = useState(false);
  const inTodos = added || !!card.has_open_todo;
  const by = card.source === "professional" ? card.author_name : card.reviewed_by_name;
  return (
    <Card style={{ gap: 10 }}>
      <View style={s.top}>
        <Tag label={topicLabel(card.topic, card.topic_name)} color={colors.lavender} />
        {card.read ? <Text style={s.read}>{t("✓ Read")}</Text> : <Text style={s.new}>{t("New")}</Text>}
      </View>
      <Text style={s.title}>{card.title}</Text>
      <Text style={s.body} numberOfLines={3}>{card.body}</Text>
      <Text style={s.meta}>
        {t("{n} min read", { n: readMinutes(card.body) })}{by ? ` · ${card.source === "professional" ? t("From {name}", { name: by }) : t("Reviewed by {name}", { name: by })}` : ""}
      </Text>
      {add.error ? <Text style={s.error}>{add.error}</Text> : null}
      <View style={s.actions}>
        <Button
          title={card.read ? t("Open again") : t("Open")}
          kind={card.read ? "outline" : "primary"}
          style={{ flex: 1 }}
          textStyle={{ fontSize: 14 }}
          onPress={() => router.push(`/card/${card.id}`)}
        />
        {card.action ? (
          <Button
            title={inTodos ? t("✓ In your to-dos") : t("Add to my to-dos")}
            kind={inTodos ? "soft" : "outline"}
            style={[{ flex: 1, paddingHorizontal: 6 }, inTodos && { backgroundColor: colors.lilac }]}
            textStyle={{ fontSize: 13 }}
            loading={add.busy}
            onPress={async () => { if (inTodos) return; const r = await add.run(() => api.addCardTodo(card.id)); if (r) { setAdded(true); onChange?.(); } }}
          />
        ) : null}
      </View>
    </Card>
  );
}

/** "Browse by topic": two columns of topics with card and read counts. */
export function TopicGrid({ cards, topics, current }: { cards: CardT[]; topics: Topic[]; current?: string }) {
  const router = useRouter();
  const tiles = [...topics.map((x) => ({ code: x.code, name: topicLabel(x.code, x.name) })), { code: GENERAL, name: t("General") }]
    .map((x) => {
      const mine = cards.filter((c) => topicOf(c) === x.code);
      return { ...x, count: mine.length, read: mine.filter((c) => c.read).length };
    })
    .filter((x) => x.count > 0 || x.code !== GENERAL);
  return (
    <View style={s.grid}>
      {tiles.map((x) => {
        const on = x.code === current;
        return (
          <Pressable
            key={x.code}
            onPress={() => (on ? null : router.push(`/topic/${x.code}`))}
            style={({ pressed }) => [s.tile, on && s.tileOn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={s.tileName} numberOfLines={1}>{x.name}</Text>
            <Text style={s.tileMeta}>{plural(x.count, "{n} card", "{n} cards")} · {t("{n} read", { n: x.read })}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TopicGridSkeleton() {
  return (
    <Skeleton style={s.grid}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={[s.tile, { gap: 8 }]}>
          <Bone w="60%" h={14} />
          <Bone w="45%" h={10} />
        </View>
      ))}
    </Skeleton>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  new: { fontFamily: fonts.medium, fontSize: 12, color: colors.purple },
  read: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink },
  title: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.muted },
  meta: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  error: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "48.5%", flexGrow: 1, flexBasis: "45%", backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14, gap: 4, borderWidth: 1.5, borderColor: colors.white },
  tileOn: { borderColor: colors.purple },
  tileName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  tileMeta: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
});
