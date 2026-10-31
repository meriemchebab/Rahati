// Landing page from Figma (gradient + logo), with the two ways in at the bottom.
import { StyleSheet, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Splash } from "../src/Splash";
import { Button } from "../src/ui";
import { AuthButton } from "../src/AuthShell";
import { useAuth } from "../src/auth";
import { colors, fonts } from "../src/theme";
import { t } from "../src/i18n";

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { me } = useAuth();
  if (me) return <Redirect href="/home" />;
  return (
    <Splash>
      <View style={[s.bottom, { paddingBottom: insets.bottom + 28 }]}>
        <View style={s.inner}>
        <Text style={s.tagline}>{t("Your peace, at your pace.")}</Text>
        <AuthButton title={t("Create my space")} onPress={() => router.push("/register")} />
        <Button title={t("I already have an account")} kind="white" height={56} onPress={() => router.push("/login")} />
        </View>
      </View>
    </Splash>
  );
}

const s = StyleSheet.create({
  // Full-width strip under the logo area (not floating), so short phones never put the buttons on the logo.
  bottom: { paddingHorizontal: 24, alignItems: "center" },
  inner: { width: "100%", maxWidth: 420, gap: 12 },
  tagline: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink, textAlign: "center", marginBottom: 8 },
});
