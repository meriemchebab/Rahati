# Rahati mobile

The woman's app for Rahati, built with Expo (React Native + TypeScript, expo-router) from the
`rahati-mobile-app` Figma file. Runs on Android, iOS (Expo Go) and the web. It talks only to the
Django API in `Backend/`; it does not change the backend.

## Run it

```bash
cd mobile
npm install
cp .env.example .env   # then set EXPO_PUBLIC_API_URL
npx expo start         # press w for web, or scan the QR code with Expo Go
```

`EXPO_PUBLIC_API_URL` is the backend address without `/api` (the deployed one, or
`http://localhost:8000`). It is read when the app is bundled, so restart Expo after changing it.
On a real phone with a local backend, use your computer's local IP and run Django with
`python manage.py runserver 0.0.0.0:8000`. For the web build, the backend must allow the app's
address in CORS.

Demo data on a development database: `python manage.py seed_demo` (demo women and verified
professionals with free slots) and `python manage.py seed_starter_cards --publish-demo` (cards).

## Screens

| Screen | Endpoints |
|---|---|
| Welcome, sign in, create space | `auth/register`, `auth/login`, `auth/refresh` (automatic) |
| Home | `check-ins` (with topics), `topics`, `cycle-starts`, `todos`, `sessions`, `analytics` (weekly summary), `content-cards` |
| Statistics | `analytics?range=7\|30\|90`, `check-ins`, `patterns`, `POST analytics` (AI summary) |
| Therapy: find someone | `wilayas`, `professionals?mode&wilaya&from&to&time_of_day`, `professionals/{id}/slots`, `POST sessions` |
| Therapy: my sessions, session | `sessions`, `sessions/{id}`, `PATCH sessions/{id}` (cancel), `consents` |
| Professional calendar | `professionals/{id}/calendar?month=`, `professionals/{id}/slots` |
| Library, topic, card | `content-cards/library`, `content-cards/{id}`, `…/read`, `…/add-todo` |
| Journal | `journal` (optionally linked to today's check-in) |
| To-dos | `todos`, `todos/{id}` (edit, delete), `…/complete`, `…/reopen` |
| Profile | `me`, `auth/change-password`, `auth/logout`, `DELETE me`, data export |
| Need help now? | none (calls 14 and 17) |

**Consent at booking.** The "Choose what to share" pop-up appears when she books, but the API
accepts consent only once the professional has accepted. The app keeps her choices on the phone
and sends them (`PUT consents`) as soon as the session shows as accepted.

**Kept on the phone only** (no endpoint yet): period start history (there is no `GET cycle-starts`),
symptoms, saved cards, avatar choice, app language.

## Languages

The app's own text comes in English (default), French and Arabic, chosen in Profile → Language.
This is separate from the lessons' language, which is on her account. Arabic switches the app to
right-to-left and the Cairo font; the app restarts to apply a change.

Texts are written in English in the code as `t("…")`; the French and Arabic versions are in
`src/i18n/fr.ts` and `src/i18n/ar.ts`, keyed by the English text. A missing translation shows
the English.

## Design

Tokens come from Figma (`src/theme.ts`): background `#E6E7FF`, white cards with 28px corners,
lilac `#E8C5FD`, lavender `#C5B8FE`, purple `#7673FF`, pink `#FB80FF`, ink `#04000F`.
Type: Poppins (Cairo in Arabic), with Nunito Bold for her name.

Icons, mood faces and the logo are SVGs exported from Figma in `assets/figma/`. After changing
one, regenerate `src/svgs.ts` with `node scripts/build-svgs.js`.

## Layout

```
mobile/
  app/              screens (expo-router: file = route)
    (tabs)/         Home, Statistics, Therapy, Journal, Profile
    pro/[id]        a professional's calendar
    session/[id]    one session and its sharing switches
    card/[id]       one lesson
    topic/[code]    one library topic
    library, todos, help, welcome, login, register
  src/
    api.ts          typed client for every endpoint, token refresh
    i18n.ts, i18n/  app languages
    ui.tsx          cards, buttons, chips, fields, placeholders
    home/           Home sections
    local.ts        what is stored only on the phone
  assets/           avatars and Figma exports
  showcase/         page for the public web demo (the app inside a phone frame)
  scripts/          SVG build, web demo publish
```
