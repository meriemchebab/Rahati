import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { proName, Session } from "../api";
import { Card } from "../ui";
import { colors, fonts } from "../theme";
import { longDateTime } from "../dates";
import { t } from "../i18n";

/** The soonest requested or accepted session that hasn't happened yet. */
export function nextSession(list: Session[] | null): Session | null {
  const now = Date.now();
  return (
    (list ?? [])
      .filter((x) => (x.status === "accepted" || x.status === "requested") && new Date(x.starts_at).getTime() > now - 60 * 60000)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0] ?? null
  );
}

export function NextSession({ session }: { session: Session }) {
  const router = useRouter();
  const online = session.mode === "online";
  const start = new Date(session.starts_at).getTime();
  const linkOpen = !!session.meeting_link && Date.now() > start - 30 * 60000 && Date.now() < start + 90 * 60000;
  const note =
    session.status === "requested"
      ? t("Waiting for her to accept your request.")
      : online
      ? linkOpen
        ? t("Your video link is open now.")
        : t("The video link opens 30 minutes before.")
      : session.professional_address
      ? session.professional_address
      : t("The address is shown once she accepts.");
  return (
    <Card color={colors.lavender} style={{ gap: 10 }}>
      <View style={s.row}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.eyebrow}>{session.status === "requested" ? t("SESSION REQUESTED") : t("YOUR NEXT SESSION")}</Text>
          <Text style={s.title} numberOfLines={1}>
            {proName(session.professional)} · {online ? t("Online") : t("In person")}
          </Text>
          <Text style={s.when}>{longDateTime(session.starts_at)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => (linkOpen ? Linking.openURL(session.meeting_link!) : router.push(`/session/${session.id}`))}
          style={({ pressed }) => [s.details, pressed && { opacity: 0.85 }]}
        >
          <Text style={s.detailsText}>{linkOpen ? t("Join") : t("Details")}</Text>
        </Pressable>
      </View>
      <Text style={s.note}>{note}</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.88, color: colors.ink },
  title: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  when: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  details: { height: 44, paddingHorizontal: 20, borderRadius: 24, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  detailsText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  note: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
});
