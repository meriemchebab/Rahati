// Learn card from the Home design (topic tag, title, preview, Read / Save).
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Card as CardT } from "./api";
import { Button, Card, Tag } from "./ui";
import { colors, fonts, topicLabel } from "./theme";
import { savedCards, toggleSavedCard } from "./local";
import { t } from "./i18n";

const minutes = (body: string) => Math.max(1, Math.round(body.split(/\s+/).length / 180));

export function LearnCard({ card, width = 288 }: { card: CardT; width?: number | `${number}%` }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    savedCards().then((ids) => setSaved(ids.includes(card.id)));
  }, [card.id]);
  const by = card.source === "professional" ? card.author_name : card.reviewed_by_name;
  return (
    <Pressable onPress={() => router.push(`/card/${card.id}`)} style={{ width }}>
      <Card style={{ gap: 10, flex: 1 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Tag label={topicLabel(card.topic, card.topic_name)} color={colors.lavender} />
          {card.read && <Tag label={t("Read")} color={colors.tint} />}
        </View>
        <Text style={s.title}>{card.title}</Text>
        <Text style={s.body} numberOfLines={4}>{card.body}</Text>
        <Text style={s.meta}>
          {t("{n} min read", { n: minutes(card.body) })}{by ? ` · ${card.source === "professional" ? t("From {name}", { name: by }) : t("Reviewed by {name}", { name: by })}` : ""}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: "auto" }}>
          <Button title={t("Read")} style={{ flex: 1 }} textStyle={{ fontSize: 13 }} onPress={() => router.push(`/card/${card.id}`)} />
          <Button title={saved ? t("Saved") : t("Save")} kind="outline" style={{ flex: 1, paddingHorizontal: 8 }} textStyle={{ fontSize: 12 }} onPress={async () => setSaved(await toggleSavedCard(card.id))} />
        </View>
      </Card>
    </Pressable>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.muted },
  meta: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
});
