// One lesson (Figma "Library · Card" and its states: added, read, error).
// The bar at the bottom stays put: Mark as read, Add to my to-dos.
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { api, errorText } from "../../src/api";
import { useLoad } from "../../src/hooks";
import { Button, Card, ErrorText, Loading, Screen, Tag } from "../../src/ui";
import { readMinutes } from "../../src/Library";
import { colors, fonts, topicLabel } from "../../src/theme";
import { mirror, t } from "../../src/i18n";

/** Splits the card text into paragraphs; a short line with no end punctuation is a heading. */
function blocks(body: string) {
  return body
    .split(/\n\s*\n|\n/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((text) => ({ text, heading: text.length < 60 && !/[.!?؟:]$/.test(text) }));
}

export default function CardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cid = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const q = useLoad(() => api.card(cid), [cid]);
  const [read, setRead] = useState(false);
  const [inTodos, setInTodos] = useState(false);
  const [busy, setBusy] = useState<"read" | "todo" | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [todoFailed, setTodoFailed] = useState(false);
  const [toast, setToast] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (q.data) {
      setRead(!!q.data.read);
      setInTodos(!!q.data.has_open_todo);
    }
  }, [q.data]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const c = q.data;
  if (!c) {
    return (
      <Screen>
        <BackLink />
        {q.loading ? <Loading cards={1} /> : <ErrorText message={q.error} />}
      </Screen>
    );
  }

  const by = c.source === "professional" ? c.author_name : c.reviewed_by_name;
  async function markRead() {
    setBusy("read");
    setFailed(null);
    try {
      await api.markRead(cid);
      setRead(true);
    } catch (e) {
      setFailed(errorText(e));
    } finally {
      setBusy(null);
    }
  }
  async function addTodo() {
    setBusy("todo");
    setFailed(null);
    setTodoFailed(false);
    try {
      await api.addCardTodo(cid);
      setInTodos(true);
      setToast(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(false), 4000);
    } catch {
      setTodoFailed(true);
      setFailed(t("Couldn't add this. Check your connection and try again."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen>
        <View style={s.head}>
          <BackLink />
          <View style={s.status}><Text style={s.statusText}>{read ? t("✓ Read") : t("Not read yet")}</Text></View>
        </View>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Tag label={topicLabel(c.topic, c.topic_name)} color={colors.lavender} />
            <Text style={s.small}>{t("{n} min read", { n: readMinutes(c.body) })}</Text>
          </View>
          <Text style={s.title}>{c.title}</Text>
          {by ? <Text style={s.small}>{c.source === "professional" ? t("From {name}", { name: by }) : t("Reviewed by {name}", { name: by })}</Text> : null}
        </View>

        <Card style={{ gap: 12 }}>
          {blocks(c.body).map((b, i) => (
            <Text key={i} style={b.heading ? s.h3 : s.body}>{b.text}</Text>
          ))}
        </Card>

        {c.action ? (
          <Card color={colors.lavender} style={{ gap: 8 }}>
            <Text style={s.eyebrow}>{t("ONE SMALL THING TO TRY")}</Text>
            <Text style={s.action}>{c.action}</Text>
            <Text style={s.hint}>{inTodos ? t("It's in your actions for today.") : t("Adding it puts it in your actions for today.")}</Text>
          </Card>
        ) : null}

        <Card style={{ gap: 12 }}>
          <Text style={s.h3}>{t("When to reach out")}</Text>
          <Text style={s.body}>
            {c.support_note || t("If heavy days last more than a couple of weeks, or you ever feel unsafe, talking to someone can help.")}
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button title={t("Find a professional")} kind="outline" style={{ flex: 1, paddingHorizontal: 6 }} textStyle={{ fontSize: 13 }} onPress={() => router.push("/therapy")} />
            <Button title={t("Need help now?")} kind="pink" style={{ flex: 1, paddingHorizontal: 6 }} textStyle={{ fontSize: 13 }} onPress={() => router.push("/help")} />
          </View>
        </Card>
        <Text style={s.disclaimer}>{t("This is general information to help you understand yourself. It is not a diagnosis or advice for your situation.")}</Text>
        <View style={{ height: 90 }} />
      </Screen>

      <View style={[s.barWrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
        {failed ? (
          <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(180)} style={s.errorBanner}>
            <Text style={s.errorText}>{failed}</Text>
          </Animated.View>
        ) : toast ? (
          <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(180)} style={s.toast}>
            <Text style={s.toastText}>{t("Added to today's actions")}</Text>
            <Pressable onPress={() => router.push("/todos")} hitSlop={10} accessibilityRole="link">
              <Text style={s.toastLink}>{t("View")}</Text>
            </Pressable>
          </Animated.View>
        ) : null}
        <View style={s.bar}>
          <Button
            title={read ? t("✓ Read") : t("Mark as read")}
            kind="outline"
            style={{ flex: 1 }}
            loading={busy === "read"}
            onPress={() => !read && markRead()}
          />
          {c.action ? (
            <Button
              title={inTodos ? t("✓ In your to-dos") : todoFailed ? t("Try again") : t("Add to my to-dos")}
              kind={inTodos ? "soft" : "primary"}
              style={[{ flex: 1, paddingHorizontal: 6 }, inTodos && { backgroundColor: colors.lilac }]}
              loading={busy === "todo"}
              onPress={() => !inTodos && addTodo()}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function BackLink() {
  const router = useRouter();
  return (
    <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/library"))} style={s.back} accessibilityRole="button" hitSlop={8}>
      <Ionicons style={mirror()} name="chevron-back" size={20} color={colors.ink} />
      <Text style={s.backText}>{t("Library")}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { flexDirection: "row", alignItems: "center", gap: 2, marginLeft: -4 },
  backText: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  status: { backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  statusText: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink },
  title: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 30, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  h3: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.ink },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.88, color: colors.ink },
  action: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24, color: colors.ink },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  disclaimer: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, color: colors.muted, paddingHorizontal: 4 },
  barWrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
  bar: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 14, backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: "#2A2540", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -2 }, elevation: 8 },
  toast: { marginHorizontal: 16, marginBottom: 10, backgroundColor: colors.ink, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toastText: { fontFamily: fonts.medium, fontSize: 13, color: colors.white },
  toastLink: { fontFamily: fonts.semibold, fontSize: 13, color: colors.white, textDecorationLine: "underline" },
  errorBanner: { marginHorizontal: 16, marginBottom: 10, backgroundColor: colors.pinkSoft, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  errorText: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: colors.ink },
});
