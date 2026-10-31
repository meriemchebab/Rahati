import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Avatar } from "../ui";
import { colors, fonts } from "../theme";
import { greeting, longDay } from "../dates";
import { t } from "../i18n";

export function Header({ nickname }: { nickname: string }) {
  const router = useRouter();
  return (
    <View style={s.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.date}>{longDay()}</Text>
        <View style={s.who}>
          <Avatar size={54} />
          <View style={{ flexShrink: 1 }}>
            <Text style={s.greet}>{greeting()}</Text>
            <Text style={s.name} numberOfLines={1}>{nickname}</Text>
          </View>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push("/help")} style={({ pressed }) => [s.help, pressed && { opacity: 0.85 }]}>
        <Text style={s.helpText}>{t("Need help now?")}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 5 },
  date: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  who: { flexDirection: "row", alignItems: "center", gap: 9 },
  greet: { fontFamily: fonts.medium, fontSize: 16.5, letterSpacing: -0.5, color: colors.ink },
  name: { fontFamily: fonts.name, fontSize: 25.5, letterSpacing: -0.77, color: colors.ink, marginTop: -6 },
  help: { height: 44, paddingHorizontal: 20, borderRadius: 24, backgroundColor: colors.pinkSoft, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  helpText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
});
