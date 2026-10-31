# Rahati mobile app

The woman's side of Rahati: a mobile app for Android and iOS, also running on the web. It is built
from the team's `rahati-mobile-app` Figma file and talks only to the Django API in `Backend/`.
Nothing outside this folder is needed or changed by it.

**Live web demo:** https://fulldready.tech/Rahati/ (the app inside a phone frame; the app alone is at
`/Rahati/app/`). It uses the deployed backend, so the first load can be slow while the server wakes up.

## Tech stack

| Part | What we use |
|---|---|
| Framework | [Expo](https://expo.dev) SDK 58, React Native 0.88, React 19 |
| Language | TypeScript |
| Navigation | expo-router (file-based: each file in `app/` is a screen) |
| Animation | react-native-reanimated 4 (nav bar, sheets, loading placeholders), react-native-gesture-handler |
| Graphics | react-native-svg (Figma icons, mood faces, logo, charts), expo-linear-gradient |
| Icons | lucide-react-native, @expo/vector-icons |
| Fonts | Poppins (Cairo for Arabic), via @expo-google-fonts |
| Storage on the phone | expo-secure-store (login tokens); localStorage on the web |
| Languages | Our own small i18n (`src/i18n.ts`): English, French, Arabic with right-to-left |
| Web | react-native-web, exported with `expo export -p web` |
| Backend | The Rahati Django REST API (JWT auth), see `Backend/` |

No state library and no UI kit: screens use a few shared components (`src/ui.tsx`) styled with the
Figma tokens (`src/theme.ts`).

## How it works

- **Sign in** with a nickname and password. The API returns a JWT access and refresh token; the app
  stores them securely and refreshes the access token on its own when it expires (`src/api.ts`).
- **Every screen loads its data from the API** when it opens, and quietly refreshes when you come
  back to it. While data loads, faded placeholders show the shape of the content.
- **One typed client** (`src/api.ts`) holds every endpoint the app uses and turns API errors into
  plain messages.
- **Consent at booking.** When she books, she ticks what the professional may see (journal,
  statistics, cycle). The API only accepts consent after the professional accepts, so the app keeps
  her choices on the phone and sends them (`PUT consents`) as soon as the session shows as accepted.
- **Kept on the phone only** (no endpoint for them yet): period start history, symptoms, saved
  lessons, avatar choice and app language.
- **App language** is separate from the lessons' language on her account. Arabic switches the whole
  app to right-to-left and the Cairo font; the app restarts to apply the change.

## Screens

| Screen | What she does | API |
|---|---|---|
| Welcome, sign in, sign up | Start with a nickname | `auth/register`, `auth/login`, `auth/refresh` |
| Home | Check in (mood, energy, topics), cycle, today's to-dos, weekly summary, lessons | `check-ins`, `topics`, `cycle-starts`, `todos`, `sessions`, `analytics`, `content-cards` |
| Statistics | Her week, month or 3 months, AI summary of her numbers | `analytics`, `check-ins`, `patterns` |
| Therapy: find someone | Filter by online / in person, wilaya, day and time; see free times; book | `wilayas`, `professionals`, `professionals/{id}/slots`, `POST sessions` |
| Therapy: my sessions | Next session, waiting requests, past sessions, cancel | `sessions`, `sessions/{id}`, `consents` |
| Library, topic, lesson | Lessons picked for her, all topics, mark as read, add the small action to her to-dos | `content-cards`, `content-cards/library`, `…/read`, `…/add-todo` |
| Journal | Write, optionally linked to today's check-in | `journal` |
| To-dos | Add, edit, complete, delete | `todos` |
| Profile | Avatar, password, language, data export, delete account | `me`, `auth/change-password`, `auth/logout` |
| Need help now? | Emergency numbers (14, 17) and a breathing exercise | none |

## Run it

Needs Node.js 18 or newer.

```bash
cd mobile-app
npm install
cp .env.example .env        # then set EXPO_PUBLIC_API_URL
npx expo start              # press w for the web, or scan the QR code with Expo Go
```

`EXPO_PUBLIC_API_URL` is the backend address without `/api` (the deployed one, or
`http://localhost:8000`). It is read when the app is bundled, so restart Expo after changing it.
On a real phone with a local backend, use your computer's local IP and run Django with
`python manage.py runserver 0.0.0.0:8000`. For the web, the backend must allow the app's address
in CORS.

Demo data on a development database: `python manage.py seed_demo` (demo women and verified
professionals with free slots) and `python manage.py seed_starter_cards --publish-demo` (lessons).

## Web demo

`showcase/` is the page of the live demo: a phone frame with a home screen, where the Rahati icon
opens the real web build of the app. `scripts/deploy-web.sh` builds the web app and publishes the
page plus the app to GitHub Pages (it only publishes from the `yomidotk/Rahati` fork).

## Languages

Texts are written in English in the code as `t("…")`. The French and Arabic versions are in
`src/i18n/fr.ts` and `src/i18n/ar.ts`, keyed by the English text; a missing translation shows the
English. Arabic speaks to her in the feminine.

## Folder layout

```
mobile-app/
  app/              screens (expo-router)
    (tabs)/         Home, Statistics, Therapy, Journal, Profile
    pro/[id]        a professional's calendar
    session/[id]    one session and its sharing switches
    card/[id]       one lesson
    topic/[code]    one library topic
    library, todos, help, welcome, login, register
  src/
    api.ts          typed API client, tokens
    auth.tsx        signed-in state
    i18n.ts, i18n/  app languages
    ui.tsx          shared components and loading placeholders
    theme.ts        Figma colours, fonts, moods, topics
    home/           Home sections
    local.ts        what is stored only on the phone
  assets/           avatars, Figma SVG exports
  showcase/         live demo page (phone frame)
  scripts/          build-svgs.js (Figma SVGs → src/svgs.ts), deploy-web.sh
```

After changing an SVG in `assets/figma/`, run `node scripts/build-svgs.js`.
