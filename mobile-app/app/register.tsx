import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api, ApiError, Lang } from "../src/api";
import { useAuth } from "../src/auth";
import { useAction } from "../src/hooks";
import { ErrorText } from "../src/ui";
import { AuthButton, AuthField, AuthShell, AuthSwitch } from "../src/AuthShell";
import { colors, fonts } from "../src/theme";
import { t } from "../src/i18n";

const LANGS: { key: Lang; label: string }[] = [
  { key: "en", label: "English" },
  { key: "fr", label: "Français" },
  { key: "ar", label: "العربية" },
];

export default function Register() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState<Lang>("fr");
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const act = useAction();

  const submit = async () => {
    setFieldErr({});
    const ok = await act.run(async () => {
      try {
        await api.register({ nickname: nickname.trim(), password, language });
      } catch (e) {
        if (e instanceof ApiError && e.data && typeof e.data === "object") {
          const d = e.data as Record<string, string[] | string>;
          setFieldErr(Object.fromEntries(Object.entries(d).map(([k, v]) => [k, Array.isArray(v) ? v.join(" ") : String(v)])));
        }
        throw e;
      }
      await signIn(nickname.trim(), password);
      return true;
    });
    if (ok) router.replace("/home");
  };

  return (
    <AuthShell
      title={t("Make your space")}
      subtitle={t("A nickname is enough. Nobody sees your real name.")}
      footer={<AuthSwitch text={t("Already have one?")} link={t("Sign in")} onPress={() => router.replace("/login")} />}
    >
      <AuthField label={t("Nickname")} icon="person-outline" value={nickname} onChangeText={setNickname} autoCapitalize="none" autoCorrect={false} placeholder={t("Choose a nickname")} error={fieldErr.nickname} />
      <AuthField label={t("Password")} icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry placeholder={t("At least 8 characters")} error={fieldErr.password} />
      <View style={{ gap: 8 }}>
        <Text style={s.label}>{t("Lessons in")}</Text>
        <View style={s.seg}>
          {LANGS.map((l) => (
            <Pressable key={l.key} onPress={() => setLanguage(l.key)} style={[s.segItem, language === l.key && s.segOn]} accessibilityRole="radio" accessibilityState={{ selected: language === l.key }}>
              <Text style={[s.segText, language === l.key && s.segTextOn]}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <ErrorText message={Object.keys(fieldErr).length ? null : act.error} />
      <AuthButton title={t("Create my space")} onPress={submit} loading={act.busy} disabled={!nickname || password.length < 8} />
    </AuthShell>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.4, color: colors.muted, textTransform: "uppercase", marginLeft: 4 },
  seg: { flexDirection: "row", backgroundColor: colors.white, borderRadius: 18, padding: 4 },
  segItem: { flex: 1, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: colors.lavender },
  segText: { fontFamily: fonts.medium, fontSize: 15, color: colors.muted },
  segTextOn: { fontFamily: fonts.semibold, color: colors.ink },
});
