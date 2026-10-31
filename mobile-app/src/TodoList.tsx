// To-do rows from the "Today's small actions" design, shared by Home and the full list.
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, Todo } from "./api";
import { useAction } from "./hooks";
import { Button, ErrorText, Field, Tag } from "./ui";
import { Sheet } from "./Sheet";
import { colors, fonts } from "./theme";
import { addDays, dayLabel, dayOfIso, isoDay, timeLabel, today } from "./dates";
import { t } from "./i18n";

function sourceTag(todo: Todo): { label: string; color: string } {
  if (todo.source === "professional") return { label: todo.assigned_by_name ? t("From {name}", { name: todo.assigned_by_name }) : t("From your professional"), color: colors.pinkSoft };
  if (todo.source === "card") return { label: t("From a card"), color: colors.pinkSoft };
  return { label: t("Mine"), color: colors.lilac };
}
function whenTag(todo: Todo): string | null {
  if (todo.done_at) {
    const d = dayOfIso(todo.done_at);
    const h = Number(timeLabel(todo.done_at).slice(0, 2));
    if (d === today()) return h < 12 ? t("Done this morning") : h < 18 ? t("Done this afternoon") : t("Done this evening");
    return t("Done {day}", { day: dayLabel(d) });
  }
  if (todo.due_date) {
    if (todo.due_date === today()) return t("Due today");
    if (todo.due_date < today()) return t("Overdue");
    return t("Due {day}", { day: dayLabel(todo.due_date) });
  }
  const added = dayOfIso(todo.created_at);
  if (added === today()) return t("Added today");
  if (added === addDays(today(), -1)) return t("Added yesterday");
  return null;
}

export function TodoRow({ todo, onChange }: { todo: Todo; onChange: () => void }) {
  const act = useAction();
  const [editing, setEditing] = useState(false);
  const done = todo.status === "done";
  const toggle = () => act.run(() => (done ? api.reopenTodo(todo.id) : api.completeTodo(todo.id))).then((r) => r && onChange());
  const src = sourceTag(todo);
  const when = whenTag(todo);
  return (
    <View style={s.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? t("Reopen") : t("Mark done")}
        onPress={toggle}
        hitSlop={8}
        style={[s.box, done && s.boxOn]}
      >
        {done && <Text style={s.tick}>✓</Text>}
      </Pressable>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[s.title, done && s.titleDone]}>{todo.title}</Text>
        <View style={s.tags}>
          <Tag label={src.label} color={src.color} />
          {when && <Tag label={when} color={when === t("Overdue") ? colors.dangerSoft : colors.lilac} />}
        </View>
        <ErrorText message={act.error} />
      </View>
      {/* A professional's to-dos are hers to change, not ours (the API refuses). */}
      {todo.source !== "professional" && (
        <Pressable onPress={() => setEditing(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("Edit {title}", { title: todo.title })} style={s.edit}>
          <Ionicons name="create-outline" size={20} color={colors.muted} />
        </Pressable>
      )}
      <EditTodo todo={todo} visible={editing} onClose={() => setEditing(false)} onChange={onChange} />
    </View>
  );
}

// Due-date choices; the API refuses dates in the past.
const DUE = [
  { label: "No date", days: null },
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "In a week", days: 7 },
] as const;

function EditTodo({ todo, visible, onClose, onChange }: { todo: Todo; visible: boolean; onClose: () => void; onChange: () => void }) {
  const [title, setTitle] = useState(todo.title);
  const [due, setDue] = useState<string | null>(todo.due_date);
  const [confirm, setConfirm] = useState(false);
  const save = useAction();
  const del = useAction();
  const reset = () => { setTitle(todo.title); setDue(todo.due_date); setConfirm(false); };
  const close = () => { onClose(); setTimeout(reset, 250); };

  // Keep an existing date that isn't one of the presets selectable as itself.
  const presets = DUE.map((d) => ({ label: d.label, value: d.days === null ? null : addDays(today(), d.days) }));
  const extra = todo.due_date && !presets.some((p) => p.value === todo.due_date) ? [{ label: todo.due_date < today() ? t("Overdue") : dayLabel(todo.due_date), value: todo.due_date }] : [];

  const submit = async () => {
    const b: { title?: string; due_date?: string | null } = {};
    if (title.trim() !== todo.title) b.title = title.trim();
    if (due !== todo.due_date) b.due_date = due;
    if (!Object.keys(b).length) return close();
    const r = await save.run(() => api.editTodo(todo.id, b));
    if (r) { onChange(); close(); }
  };
  const remove = async () => {
    const ok = await del.run(async () => { await api.deleteTodo(todo.id); return true; });
    if (ok) { onClose(); onChange(); }
  };

  return (
    <Sheet visible={visible} title={t("Edit to-do")} onClose={close}>
      <Field value={title} onChangeText={setTitle} placeholder={t("Drink water and stretch")} onSubmitEditing={submit} />
      <Text style={s.label}>{t("Due")}</Text>
      <View style={s.chips}>
        {[...extra, ...presets].map((p) => {
          const on = due === p.value;
          return (
            <Pressable key={p.label} onPress={() => setDue(p.value)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[s.chip, on && s.chipOn]}>
              <Text style={[s.chipText, on && s.chipTextOn]}>{t(p.label)}</Text>
            </Pressable>
          );
        })}
      </View>
      <ErrorText message={save.error ?? del.error} />
      <Button title={t("Save")} height={52} onPress={submit} loading={save.busy} disabled={!title.trim()} />
      {confirm ? (
        <View style={s.confirm}>
          <Text style={[s.title, { flex: 1 }]}>{t("Delete this to-do?")}</Text>
          <Pressable onPress={() => setConfirm(false)} hitSlop={8}><Text style={s.cancel}>{t("Keep")}</Text></Pressable>
          <Pressable onPress={remove} hitSlop={8} disabled={del.busy}><Text style={s.danger}>{del.busy ? t("Deleting…") : t("Delete")}</Text></Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setConfirm(true)} style={s.delBtn} accessibilityRole="button">
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={s.danger}>{t("Delete to-do")}</Text>
        </Pressable>
      )}
    </Sheet>
  );
}

/** "+ Add a to-do" dashed button and its sheet. */
export function AddTodo({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueToday, setDueToday] = useState(false);
  const act = useAction();
  const submit = async () => {
    const r = await act.run(() => api.addTodo({ title: title.trim(), due_date: dueToday ? isoDay() : null }));
    if (r) {
      setTitle("");
      setDueToday(false);
      setOpen(false);
      onAdded();
    }
  };
  return (
    <>
      <Button title="+ Add a to-do" kind="dashed" onPress={() => setOpen(true)} />
      <Sheet visible={open} title={t("A small thing for you")} onClose={() => setOpen(false)}>
        <Field value={title} onChangeText={setTitle} placeholder={t("Drink water and stretch")} autoFocus onSubmitEditing={submit} />
        <Pressable onPress={() => setDueToday(!dueToday)} style={s.dueRow} accessibilityRole="checkbox" accessibilityState={{ checked: dueToday }}>
          <View style={[s.box, dueToday && s.boxOn]}>{dueToday && <Text style={s.tick}>✓</Text>}</View>
          <Text style={s.title}>{t("Due today")}</Text>
        </Pressable>
        <ErrorText message={act.error} />
        <Button title={t("Add")} height={52} onPress={submit} loading={act.busy} disabled={!title.trim()} />
      </Sheet>
    </>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: colors.white, borderRadius: 16, padding: 12 },
  box: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: colors.purple, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: colors.purple },
  tick: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, marginTop: -1 },
  title: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  titleDone: { color: colors.muted, textDecorationLine: "line-through" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  edit: { paddingTop: 2 },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1.5, borderColor: colors.chipLine, backgroundColor: colors.white, justifyContent: "center" },
  chipOn: { backgroundColor: colors.purple, borderColor: colors.purple },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  chipTextOn: { fontFamily: fonts.semibold, color: colors.white },
  delBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 44 },
  confirm: { flexDirection: "row", alignItems: "center", gap: 18, height: 44 },
  cancel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  danger: { fontFamily: fonts.semibold, fontSize: 14, color: colors.danger },
  dueRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
