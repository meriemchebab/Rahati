// Sign-in / sign-up frame: continues the landing gradient, with a frosted card in a
// centered column (max 420px) so nothing can spill past the screen edges.
import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Icon } from "./ui";
import { colors, fonts } from "./theme";
import { mirror, t } from "./i18n";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const Scroller = Platform.OS === "web" ? ScrollView : KeyboardAwareScrollView;
  return (
    <LinearGradient colors={["#C5B8FE", "#E9E9FC", "#D9D0FF"]} locations={[0, 0.55, 1]} style={{ flex: 1 }}>
      <Scroller
        bottomOffset={24}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}
      >
        <View style={s.column}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/welcome"))}
            style={s.back}
            accessibilityRole="button"
            accessibilityLabel={t("Back")}
            hitSlop={8}
          >
            <Ionicons style={mirror()} name="chevron-back" size={20} color={colors.ink} />
          </Pressable>

          <View style={s.middle}>
            <View style={s.head}>
              <Icon name="logoMark" width={84} height={75} />
              <Text style={s.title}>{title}</Text>
              <Text style={s.subtitle}>{subtitle}</Text>
            </View>
            <View style={s.glass}>{children}</View>
          </View>
          {footer}
        </View>
      </Scroller>
    </LinearGradient>
  );
}

/** Soft input with a leading icon and a small caps label. */
export function AuthField({
  label,
  icon,
  error,
  hint,
  secureTextEntry,
  ...props
}: TextInputProps & { label: string; icon: keyof typeof Ionicons.glyphMap; error?: string; hint?: string }) {
  const [shown, setShown] = useState(false);
  const [focused, setFocused] = useState(false);
  const secret = !!secureTextEntry;
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.input, focused && s.inputFocus, error ? { borderColor: colors.danger } : null]}>
        <Ionicons name={icon} size={18} color={focused ? colors.purpleDeep : colors.placeholder} />
        <TextInput
          placeholderTextColor={colors.placeholder}
          {...props}
          secureTextEntry={secret && !shown}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          style={s.text}
        />
        {secret && (
          <Pressable accessibilityRole="button" accessibilityLabel={shown ? t("Hide password") : t("Show password")} onPress={() => setShown(!shown)} hitSlop={10}>
            <Ionicons name={shown ? "eye-off-outline" : "eye-outline"} size={20} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Deep purple gradient button with white text. */
export function AuthButton({ title, onPress, loading, disabled }: { title: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [s.btnWrap, { opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <LinearGradient colors={[colors.purple, colors.purpleDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
        {loading ? <ActivityIndicator color={colors.white} /> : <Text style={s.btnText}>{title}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

/** "New here? Create my space" line under the card. */
export function AuthSwitch({ text, link, onPress }: { text: string; link: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={s.switch} hitSlop={8}>
      <Text style={s.switchText}>
        {text} <Text style={s.switchLink}>{link}</Text>
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  column: { flex: 1, width: "100%", maxWidth: 420, alignSelf: "center" },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  middle: { flex: 1, justifyContent: "center", paddingVertical: 12 },
  head: { alignItems: "center", marginTop: 8, marginBottom: 28 },
  title: { fontFamily: fonts.semibold, fontSize: 30, letterSpacing: -0.8, color: colors.ink, marginTop: 18, textAlign: "center" },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.muted, marginTop: 6, textAlign: "center", maxWidth: 300 },
  glass: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    padding: 22,
    gap: 18,
    // No shadow/elevation: on a see-through card Android draws it as a blurry box behind the glass.
  },
  label: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.4, color: colors.muted, textTransform: "uppercase", marginLeft: 4 },
  input: { height: 56, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1.5, borderColor: "transparent", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  inputFocus: { borderColor: colors.lavender },
  text: { flex: 1, minWidth: 0, height: "100%", fontFamily: fonts.regular, fontSize: 16, color: colors.ink, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null) },
  error: { fontFamily: fonts.regular, fontSize: 12, color: colors.danger, marginLeft: 4 },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginLeft: 4 },
  btnWrap: { borderRadius: 28, shadowColor: "#524DFC", shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  btn: { height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  btnText: { fontFamily: fonts.semibold, fontSize: 16, letterSpacing: 0.2, color: colors.white },
  switch: { alignSelf: "center", paddingVertical: 16 },
  switchText: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: "center" },
  switchLink: { fontFamily: fonts.semibold, color: colors.purpleDeep },
});
