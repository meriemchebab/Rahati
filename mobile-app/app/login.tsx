import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../src/auth";
import { useAction } from "../src/hooks";
import { ErrorText } from "../src/ui";
import { AuthButton, AuthField, AuthShell, AuthSwitch } from "../src/AuthShell";
import { t } from "../src/i18n";

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const act = useAction();
  const submit = async () => {
    const ok = await act.run(async () => {
      await signIn(nickname.trim(), password);
      return true;
    });
    if (ok) router.replace("/home");
  };
  return (
    <AuthShell
      title={t("Welcome back")}
      subtitle={t("Your space is just as you left it.")}
      footer={<AuthSwitch text={t("New here?")} link={t("Create my space")} onPress={() => router.replace("/register")} />}
    >
      <AuthField label={t("Nickname")} icon="person-outline" value={nickname} onChangeText={setNickname} autoCapitalize="none" autoCorrect={false} placeholder={t("Your nickname")} returnKeyType="next" />
      <AuthField label={t("Password")} icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry placeholder={t("Your password")} onSubmitEditing={submit} returnKeyType="go" />
      <ErrorText message={act.error} />
      <AuthButton title={t("Sign in")} onPress={submit} loading={act.busy} disabled={!nickname || !password} />
    </AuthShell>
  );
}
