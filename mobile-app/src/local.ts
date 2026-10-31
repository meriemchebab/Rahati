// Things the backend doesn't store yet, kept on this phone only.
// (Period history, symptoms, saved cards, avatar choice, share choices made at booking.)
import { getItem, setItem } from "./storage";
import { today } from "./dates";

const KEYS = { periods: "rahati.periods", symptoms: "rahati.symptoms", saved: "rahati.savedCards", avatar: "rahati.avatar", share: "rahati.pendingShare" };

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
const writeJson = (key: string, value: unknown) => setItem(key, JSON.stringify(value));

// Period starts: the backend accepts new ones (POST cycle-starts) but can't list them,
// so the app remembers the ones logged here to draw the cycle ring.
export async function periodStarts(): Promise<string[]> {
  return (await readJson<string[]>(KEYS.periods, [])).sort();
}
export async function rememberPeriodStart(day: string) {
  const list = new Set(await periodStarts());
  list.add(day);
  await writeJson(KEYS.periods, [...list].sort());
}

export type SymptomLog = { date: string; items: string[] };
export async function symptoms(): Promise<SymptomLog[]> {
  return readJson<SymptomLog[]>(KEYS.symptoms, []);
}
export async function saveSymptoms(items: string[], date = today()) {
  const all = (await symptoms()).filter((s) => s.date !== date);
  if (items.length) all.push({ date, items });
  await writeJson(KEYS.symptoms, all);
}

export async function savedCards(): Promise<number[]> {
  return readJson<number[]>(KEYS.saved, []);
}
export async function toggleSavedCard(id: number): Promise<boolean> {
  const list = new Set(await savedCards());
  const nowSaved = !list.has(id);
  nowSaved ? list.add(id) : list.delete(id);
  await writeJson(KEYS.saved, [...list]);
  return nowSaved;
}

// Share choices ticked when booking. The backend only accepts consent once the professional
// has accepted a session, so they wait here (by session id) until then.
export type ShareChoice = "mood" | "journal" | "cycle";
type PendingShare = Record<string, { professional: number; items: ShareChoice[] }>;
export async function pendingShares(): Promise<PendingShare> {
  return readJson<PendingShare>(KEYS.share, {});
}
export async function rememberShare(session: number, professional: number, items: ShareChoice[]) {
  const all = await pendingShares();
  all[session] = { professional, items };
  await writeJson(KEYS.share, all);
}
export async function forgetShare(session: number) {
  const all = await pendingShares();
  delete all[session];
  await writeJson(KEYS.share, all);
}

// Pictures ship inside the app (assets/avatars); only the chosen name is stored.
export const AVATARS = ["brownWavy", "blondeBob", "blackLong", "gingerUpdo", "pinkPixie", "redPlaid"] as const;
export const DEFAULT_AVATAR: AvatarName = "pinkPixie";
export type AvatarName = (typeof AVATARS)[number];
const listeners = new Set<(a: AvatarName) => void>();
export async function avatarChoice(): Promise<AvatarName> {
  const a = await readJson<AvatarName>(KEYS.avatar, DEFAULT_AVATAR);
  return AVATARS.includes(a) ? a : DEFAULT_AVATAR; // older picks fall back to the default
}
export async function setAvatarChoice(a: AvatarName) {
  await writeJson(KEYS.avatar, a);
  listeners.forEach((f) => f(a));
}
/** Lets every avatar on screen (Home header, Profile) follow a new pick. */
export function onAvatarChange(f: (a: AvatarName) => void) {
  listeners.add(f);
  return () => { listeners.delete(f); };
}

// ---------- cycle maths (28-day default, the same phases as the design) ----------
export type Phase = "Menstruation" | "Follicular" | "Ovulation" | "Luteal";
export const CYCLE_LENGTH = 28;
export const PHASES: { name: Phase; from: number; to: number; color: string }[] = [
  { name: "Menstruation", from: 1, to: 5, color: "#FB80FF" },
  { name: "Follicular", from: 6, to: 13, color: "#E8C5FD" },
  { name: "Ovulation", from: 14, to: 16, color: "#C5B8FE" },
  { name: "Luteal", from: 17, to: 28, color: "#7673FF" },
];
export function phaseOf(day: number): Phase {
  return (PHASES.find((p) => day >= p.from && day <= p.to) ?? PHASES[3]).name;
}
