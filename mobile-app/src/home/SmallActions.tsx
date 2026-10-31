import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Todo } from "../api";
import { Card, SectionHeader } from "../ui";
import { AddTodo, TodoRow } from "../TodoList";
import { colors, fonts } from "../theme";
import { dayOfIso, today } from "../dates";
import { t } from "../i18n";

/** Open to-dos plus the ones finished today, open first. */
export function todaysActions(list: Todo[]): Todo[] {
  return list
    .filter((t) => t.status !== "done" || (t.done_at && dayOfIso(t.done_at) === today()))
    .sort((a, b) => Number(a.status === "done") - Number(b.status === "done"));
}

export function SmallActions({ todos, onChange }: { todos: Todo[]; onChange: () => void }) {
  const router = useRouter();
  const shown = todaysActions(todos);
  const done = shown.filter((t) => t.status === "done").length;
  const pct = shown.length ? done / shown.length : 0;
  return (
    <Card color={colors.lilac} style={{ gap: 12 }}>
      <SectionHeader title={t("Today’s small actions")} link={t("See all")} onLink={() => router.push("/todos")} />
      <Text style={s.count}>{shown.length ? t("{done} of {total} done", { done, total: shown.length }) : t("Nothing yet. Add one small thing for today.")}</Text>
      <View style={s.track}>
        <View style={[s.fill, { width: `${Math.round(pct * 100)}%` }]} />
      </View>
      {shown.slice(0, 5).map((t) => (
        <TodoRow key={t.id} todo={t} onChange={onChange} />
      ))}
      <AddTodo onAdded={onChange} />
    </Card>
  );
}

const s = StyleSheet.create({
  count: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  track: { height: 10, borderRadius: 6, backgroundColor: colors.white, overflow: "hidden" },
  fill: { height: 10, borderRadius: 6, backgroundColor: colors.purple },
});
