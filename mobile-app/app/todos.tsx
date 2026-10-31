import { Text } from "react-native";
import { api } from "../src/api";
import { useLoad } from "../src/hooks";
import { Card, ErrorText, Screen, SkeletonLines, Small, TopBar } from "../src/ui";
import { AddTodo, TodoRow } from "../src/TodoList";
import { t } from "../src/i18n";

export default function Todos() {
  const q = useLoad(() => api.todos());
  const list = q.data ?? [];
  const open = list.filter((t) => !t.done_at);
  const done = list.filter((t) => t.done_at).sort((a, b) => b.done_at!.localeCompare(a.done_at!));
  return (
    <Screen refreshing={q.refreshing} onRefresh={q.reload}>
      <TopBar title={t("My to-dos")} />
      <ErrorText message={q.error} />
      <Card style={{ gap: 10 }}>
        {q.loading && !q.data ? <SkeletonLines rows={2} /> : null}
        {open.length === 0 && q.data && <Small>{t("Nothing open. Add one small thing for today.")}</Small>}
        {open.map((t) => <TodoRow key={t.id} todo={t} onChange={q.reload} />)}
        <AddTodo onAdded={q.reload} />
      </Card>
      {done.length > 0 && (
        <Card style={{ gap: 10 }}>
          <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 18 }}>{t("Done")}</Text>
          {done.map((t) => <TodoRow key={t.id} todo={t} onChange={q.reload} />)}
        </Card>
      )}
    </Screen>
  );
}
