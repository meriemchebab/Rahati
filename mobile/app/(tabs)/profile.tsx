import { useEffect, useState } from "react";
import { Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../src/api";
import { useAuth } from "../../src/auth";
import { useAction } from "../../src/hooks";
import { Avatar, Body, Button, Card, ErrorText, Field, Icon, Notice, Screen } from "../../src/ui";
import { Sheet } from "../../src/Sheet";
import { colors, fonts } from "../../src/theme";
import { AVATARS, AvatarName, avatarChoice, DEFAULT_AVATAR, periodStarts, savedCards, setAvatarChoice, symptoms } from "../../src/local";
import type { SvgName } from "../../src/svgs";
import { setUiLang, t, UI_LANGS, uiLang } from "../../src/i18n";

type SheetName = "nickname" | "appearance" | "avatar" | "language" | "notifications" | "privacy" | "delete" | null;

function Row({ icon, label, onPress, size = 17.8 }: { icon: SvgName; label: string; onPress: () => void; size?: number }) {
  // The design is 393px wide; shrink a little on narrower phones so labels stay on one line.
  const k = Math.min(1, useWindowDimensions().width / 393);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]} hitSlop={4}>
      <Icon name={icon} width={29.6 * k} />
      <Text style={[s.rowText, { fontSize: size * k * k }]} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

export default function Profile() {
  const router = useRouter();
  const { me, signOut, forget } = useAuth();
  const [open, setOpen] = useState<SheetName>(null);
  const [avatar, setAvatar] = useState<AvatarName>(DEFAULT_AVATAR);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    avatarChoice().then(setAvatar);
  }, []);

  const exportData = useAction();
  const download = async () => {
    setMsg(null);
    const data = await exportData.run(async () => {
      const [account, checkIns, journal, todos, sessions] = await Promise.all([api.me(), api.checkIns(), api.journal(), api.todos(), api.sessions()]);
      return { exported_at: new Date().toISOString(), account, check_ins: checkIns, journal, todos, sessions, on_this_phone: { period_starts: await periodStarts(), symptoms: await symptoms(), saved_cards: await savedCards() } };
    });
    if (data) await Share.share({ title: t("My Rahati data"), message: JSON.stringify(data, null, 2) });
  };

  const pw = useAction();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const del = useAction();
  const [typed, setTyped] = useState("");

  return (
    <Screen tabs>
      <Card color={colors.lilac} style={{ paddingTop: 11 }}>
        <Text style={s.h1}>{t("Profile")}</Text>
        {/* Avatar centred with her name under it; her account options sit below in two columns. */}
        <View style={s.me}>
          <Pressable onPress={() => setOpen("avatar")} accessibilityLabel={t("Change avatar")}>
            <Avatar size={110} choice={avatar} />
            <View style={s.pen}>
              <Icon name="avatarPen" width={30} />
              <View style={s.penGlyph}><Icon name="pen" width={15} height={14.7} /></View>
            </View>
          </Pressable>
          <Text style={s.name} numberOfLines={1}>{me?.nickname}</Text>
        </View>
        <View style={s.settings}>
          <View style={s.settingsCol}>
            <Row icon="pNickname" label={t("Nickname")} size={16.4} onPress={() => setOpen("nickname")} />
            <Row icon="pDownload" label={exportData.busy ? t("Preparing…") : t("Download data")} size={16.4} onPress={download} />
          </View>
          <View style={s.settingsCol}>
            <Row icon="pAppearance" label={t("Appearance")} size={16.4} onPress={() => setOpen("appearance")} />
            <Row icon="pAvatar" label={t("Change avatar")} size={16.4} onPress={() => setOpen("avatar")} />
          </View>
        </View>
        <ErrorText message={exportData.error} />
      </Card>

      <Card style={{ paddingTop: 10 }}>
        <Text style={s.h1}>{t("Settings")}</Text>
        <View style={s.settings}>
          <View style={s.settingsCol}>
            <Row icon="sLanguage" label={t("Language")} size={16.4} onPress={() => setOpen("language")} />
            <Row icon="sHelp" label={t("Help")} size={16.4} onPress={() => router.push("/help")} />
            <Row icon="sPrivacy" label={t("Privacy Policy")} size={16.4} onPress={() => setOpen("privacy")} />
          </View>
          <View style={s.settingsCol}>
            <Row icon="sNotifications" label={t("Notifications")} size={16.4} onPress={() => setOpen("notifications")} />
            <Row icon="sLogout" label={t("Logout")} size={16.4} onPress={async () => { await signOut(); router.replace("/welcome"); }} />
          </View>
        </View>
      </Card>

      <Card color={colors.dangerSoft} style={{ paddingTop: 18 }}>
        <Text style={s.deleteTitle}>{t("DELETE MY ACCOUNT")}</Text>
        <Text style={s.deleteBody}>{t("This removes your account and everything you've written or tracked. It can't be undone.")}</Text>
        <Pressable onPress={() => { setTyped(""); del.setError(null); setOpen("delete"); }} style={{ paddingVertical: 8 }} accessibilityRole="button">
          <Text style={s.deleteLink}>{t("Delete my account…")}</Text>
        </Pressable>
      </Card>
      <Notice message={msg} />

      {/* ---- sheets ---- */}
      <Sheet visible={open === "nickname"} title={t("Account")} onClose={() => setOpen(null)}>
        <Body>{t("Your nickname is {name}. Changing it isn’t possible yet.", { name: me?.nickname ?? "" })}</Body>
        <Field label={t("Current password")} value={current} onChangeText={setCurrent} secureTextEntry />
        <Field label={t("New password")} value={next} onChangeText={setNext} secureTextEntry hint={t("At least 8 characters.")} />
        <ErrorText message={pw.error} />
        <Button
          title={t("Change password")}
          height={52}
          loading={pw.busy}
          disabled={!current || next.length < 8}
          onPress={async () => { const r = await pw.run(() => api.changePassword(current, next)); if (r) { setCurrent(""); setNext(""); setOpen(null); setMsg(t("Password changed.")); } }}
        />
      </Sheet>

      <Sheet visible={open === "appearance"} title={t("Appearance")} onClose={() => setOpen(null)}>
        <Body>{t("Rahati uses the light theme. A dark theme is coming.")}</Body>
      </Sheet>

      <Sheet visible={open === "avatar"} title={t("Choose your avatar")} onClose={() => setOpen(null)}>
        <View style={s.avatars}>
          {AVATARS.map((a) => (
            <Pressable key={a} onPress={async () => { setAvatar(a); await setAvatarChoice(a); setOpen(null); }} style={[s.avatarPick, avatar === a && s.avatarOn]}>
              <Avatar size={72} choice={a} />
            </Pressable>
          ))}
        </View>
        <Text style={s.small}>{t("Saved on this phone only.")}</Text>
      </Sheet>

      <Sheet visible={open === "language"} title={t("App language")} onClose={() => setOpen(null)}>
        <View style={{ gap: 8 }}>
          {UI_LANGS.map((l) => {
            const on = uiLang() === l.code;
            return (
              <Pressable key={l.code} onPress={() => (on ? setOpen(null) : setUiLang(l.code))} style={[s.lang, on && s.langOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                <Text style={s.langText}>{l.label}</Text>
                {on && <Text style={s.langCheck}>✓</Text>}
              </Pressable>
            );
          })}
        </View>
        <Text style={s.small}>{t("The app restarts to switch language.")}</Text>
        <Text style={s.small}>{t("Lessons stay in {lang}: that is set on your account.", { lang: me?.language === "ar" ? "العربية" : me?.language === "en" ? "English" : "Français" })}</Text>
      </Sheet>

      <Sheet visible={open === "notifications"} title={t("Notifications")} onClose={() => setOpen(null)}>
        <Body>{t("Gentle reminders to check in and before your sessions are coming soon. Rahati never sends what you write in a notification.")}</Body>
      </Sheet>

      <Sheet visible={open === "privacy"} title={t("Privacy, in plain words")} onClose={() => setOpen(null)}>
        <Body>{t("• A nickname is enough. Email and phone are optional.")}</Body>
        <Body>{t("• Your journal is encrypted before it is stored.")}</Body>
        <Body>{t("• A professional sees your mood, journal or cycle only after you accept a session and turn sharing on for that one thing. You can turn it off anytime.")}</Body>
        <Body>{t("• The AI summary uses your numbers only, never what you write. It describes; it never diagnoses.")}</Body>
        <Body>{t("• Delete means delete: one tap removes everything you own.")}</Body>
      </Sheet>

      <Sheet visible={open === "delete"} title={t("Delete my account")} onClose={() => setOpen(null)}>
        <Body>{t("Type your nickname to confirm. Your check-ins, journal, to-dos and sessions will be removed for good.")}</Body>
        <Field value={typed} onChangeText={setTyped} autoCapitalize="none" placeholder={me?.nickname} />
        <ErrorText message={del.error} />
        <Button
          title={t("Delete everything")}
          kind="danger"
          height={52}
          disabled={typed !== me?.nickname}
          loading={del.busy}
          onPress={async () => { const ok = await del.run(async () => { await api.deleteMe(); return true; }); if (ok) { forget(); router.replace("/welcome"); } }}
        />
      </Sheet>
    </Screen>
  );
}

const s = StyleSheet.create({
  h1: { fontFamily: fonts.semibold, fontSize: 28, color: colors.ink },
  me: { alignItems: "center", gap: 6, marginTop: 4, marginBottom: 6 },
  name: { fontFamily: fonts.medium, fontSize: 26, letterSpacing: -0.6, color: colors.ink, textAlign: "center" },
  pen: { position: "absolute", right: -4, bottom: 2 },
  penGlyph: { position: "absolute", left: 8, top: 7.5 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowText: { flex: 1, fontFamily: fonts.semibold, color: colors.ink, letterSpacing: -0.09 },
  settings: { flexDirection: "row", gap: 4 },
  settingsCol: { flex: 1, gap: 10 },
  deleteTitle: { fontFamily: fonts.semibold, fontSize: 26, color: colors.danger },
  deleteBody: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink },
  deleteLink: { fontFamily: fonts.semibold, fontSize: 16, color: colors.danger, textAlign: "center" },
  small: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  avatars: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  avatarPick: { padding: 4, borderRadius: 50, borderWidth: 2, borderColor: "transparent" },
  avatarOn: { borderColor: colors.purple },
  lang: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.tint, borderRadius: 18, paddingHorizontal: 18, height: 54, borderWidth: 1.5, borderColor: colors.tint },
  langOn: { borderColor: colors.purple, backgroundColor: colors.white },
  langText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  langCheck: { fontFamily: fonts.bold, fontSize: 18, color: colors.purple },
});
