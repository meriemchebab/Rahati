// "Choose what to share" pop-up shown when she books (Figma: Therapy · Consent pop-up).
// The backend only takes consent after the professional accepts, so the ticks are kept on
// the phone and sent by applyPendingShares() once the session shows as accepted.
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, Session } from "./api";
import { Button } from "./ui";
import { colors, fonts } from "./theme";
import { forgetShare, pendingShares, ShareChoice } from "./local";
import { t } from "./i18n";

export const SHARE_OPTIONS: { key: ShareChoice; title: string; hint: string }[] = [
  { key: "journal", title: "I consent to sharing my journal", hint: "Your written entries and reflections." },
  { key: "mood", title: "I consent to sharing my statistics", hint: "Your mood and energy check-ins and weekly patterns." },
  { key: "cycle", title: "I consent to sharing my cycle", hint: "Your period dates and cycle symptoms." },
];
export const shareLabel = (items: ShareChoice[]) =>
  items.length ? items.map((k) => t(k === "mood" ? "statistics" : k)).join(", ") : t("nothing");

export function ConsentSheet({
  visible,
  who,
  summary,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  who: string;
  summary: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: (items: ShareChoice[]) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<ShareChoice[]>([]);
  useEffect(() => {
    if (visible) setItems([]);
  }, [visible]);
  const toggle = (k: ShareChoice) => setItems((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]));
  const first = who.replace(/^(Dr\.?\s*\S+).*/, "$1");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            <Pressable onPress={onClose} style={s.close} accessibilityRole="button" accessibilityLabel={t("Close")} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </Pressable>
            <View style={s.lock}>
              <Ionicons name="lock-closed-outline" size={30} color={colors.purple} />
            </View>
            <Text style={s.title}>{t("Choose what to share")}</Text>
            <View style={s.pill}><Text style={s.pillText} numberOfLines={1}>{summary}</Text></View>
            <Text style={s.lead}>
              {t("Only {name} can see what you tick, and only after she accepts your session. You can change or revoke it at any time.", { name: first })}
            </Text>
            {SHARE_OPTIONS.map((o) => {
              const on = items.includes(o.key);
              return (
                <Pressable key={o.key} onPress={() => toggle(o.key)} style={s.option} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                  <View style={[s.box, on && s.boxOn]}>{on && <Ionicons name="checkmark" size={16} color={colors.white} />}</View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.optTitle}>{t(o.title)}</Text>
                    <Text style={s.optHint}>{t(o.hint)}</Text>
                  </View>
                </Pressable>
              );
            })}
            <View style={s.info}>
              <Text style={s.infoTitle}>{t("Your data, your control")}</Text>
              <Text style={s.infoText}>{t("You can change or revoke your consent at any time from the session page.")}</Text>
            </View>
            {error ? <Text style={s.error}>{error}</Text> : null}
            <Button title={t("Confirm booking")} height={52} loading={busy} onPress={() => onConfirm(items)} textStyle={{ fontSize: 15 }} />
            <Button title={t("Skip for now")} kind="outline" height={52} disabled={busy} onPress={() => onConfirm([])} textStyle={{ fontSize: 15 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Sends share choices kept from booking once their session is accepted. */
export async function applyPendingShares(sessions: Session[]) {
  const pending = await pendingShares();
  for (const x of sessions) {
    const p = pending[x.id];
    if (!p) continue;
    if (x.status === "accepted") {
      try {
        for (const c of p.items) await api.setConsent(p.professional, c, true);
        await forgetShare(x.id);
      } catch {
        /* try again next time the sessions load */
      }
    } else if (x.status !== "requested") {
      await forgetShare(x.id); // declined or cancelled: nothing to share
    }
  }
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(4,0,15,0.45)", justifyContent: "center", padding: 16 },
  card: { backgroundColor: colors.white, borderRadius: 32, maxHeight: "92%", maxWidth: 440, width: "100%", alignSelf: "center" },
  content: { padding: 20, paddingTop: 16, gap: 12 },
  close: { alignSelf: "flex-end", marginBottom: -24 },
  lock: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.lilac, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  title: { fontFamily: fonts.semibold, fontSize: 20, color: colors.ink, textAlign: "center" },
  pill: { alignSelf: "center", backgroundColor: colors.tint, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, maxWidth: "100%" },
  pillText: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink },
  lead: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.muted, textAlign: "center" },
  option: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: colors.tint, borderRadius: 18, padding: 14 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.purple, alignItems: "center", justifyContent: "center", marginTop: 1 },
  boxOn: { backgroundColor: colors.purple },
  optTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  optHint: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted },
  info: { backgroundColor: colors.lilac, borderRadius: 18, padding: 14, gap: 4 },
  infoTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  infoText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.inkSoft },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger, textAlign: "center" },
});
