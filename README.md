# Studieassistenten

En React Native-app (Expo + TypeScript) som hjälper studenter att förstå kursmaterial genom AI-genererade sammanfattningar, flashkort, mindmaps och quizfrågor.

## Stack

- **Frontend**: Expo (React Native + TypeScript)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: Claude API

## Kom igång

1. Installera beroenden:
   ```bash
   npm install
   ```

2. Kopiera `.env.example` till `.env` och fyll i Supabase-nycklar:
   ```
   SUPABASE_URL=https://<project>.supabase.co
   SUPABASE_ANON_KEY=<anon-key>
   ```

3. Kör SQL-migrationen i Supabase Dashboard (SQL Editor) i denna ordning:
   ```
   supabase/schema.sql          ← grundschema (kör en gång)
   supabase/migration_v6_all.sql ← match_scores, study_plans, user_settings, focus_sessions
   ```

4. Starta appen:
   ```bash
   npx expo start
   ```

## Datamodell

| Tabell                    | Beskrivning                                                |
|---------------------------|------------------------------------------------------------|
| `courses`                 | Kurser skapade av användaren                               |
| `documents`               | Uppladdade PDF:er kopplade till en kurs                    |
| `summaries`               | AI-genererade sammanfattningar                             |
| `flashcards`              | Fråga/svar-kort med SM-2-metadata                          |
| `mindmaps`                | Mindmaps (JSON)                                            |
| `quiz_questions`          | Flervalsfrågor med rätt svar                               |
| `user_stats`              | Streakdata per användare                                   |
| `match_scores`            | Bästa matcha-tider per kurs                                |
| `study_plans`             | Återkommande eller engångs studiepass (dag/tid/längd)      |
| `study_plan_completions`  | Vilka studiepass som markerats som klara per datum         |
| `user_settings`           | Fokustimer-inställningar + notisalternativ                 |
| `focus_sessions`          | Sparade fokussessioner (minuter + kurs)                    |

Alla tabeller har Row Level Security – användare ser bara sin egen data.

## Design

Grunden är alltid papper/bläck: `colors.paper` (#F7F5F0) som bakgrund,
`colors.ink` (#1D2A38) som text- och accentfärg, `serif`/`mono`-typsnitt
för rubriker respektive metadata. Signaturgult (`colors.highlight`,
#F4D35E) är medvetet sparsamt – se gul-regeln nedan.

### Kursfärger

Varje kurs har en egen färg (`courses.color`), vald från en fast palett:

| Namn     | Hex       |
|----------|-----------|
| indigo   | `#5B6ABF` |
| salvia   | `#6B8F71` |
| ockra    | `#C08552` |
| plommon  | `#8E5B7A` |
| petrol   | `#4A7A8C` |
| rost     | `#C1666B` |

En ny kurs tilldelas automatiskt nästa lediga färg i paletten
(`nextCourseColor()` i `theme/tokens.ts`) – först en färg ingen annan
kurs använder, annars cyklas paletten. Färgen kan alltid ändras vid
redigering av kursen.

Kursfärgen syns överallt kursen förekommer:
- 4px vänsterkant på studiepass-kort (Idag + Planera)
- Ikonbricka (34px rundad kvadrat) på kurskort
- Kursnamnet i pass-metadata
- Progressbaren på kurskort (andel flashkort som inte är förfallna)
- Kurs-chippen och timerringen i Fokustimern (när en kurs är vald)

### Gul-regeln

Signaturgult är reserverat för **max en meningsfull accent per skärm**
– aldrig som dekoration bakom vanliga skärmrubriker. De accepterade
platserna:
- Streak-badgen (Kurser-vyn)
- Aktiv dag i Planera-vyn (den lilla prick vid dagens datum)
- Fokustimer-kortets progressring + play-ikon på Idag (ersätter den
  gamla helgula bakgrunden)
- Timerringen i Fokustimern, när ingen kurs är vald (annars tar
  kursens egen färg över ringen)

`HighlighterText` (den handritade gula överstrykningen, 350ms
vänster→höger) används bara för Studieassistenten-logotypen på
inloggningsskärmen – inte för skärmrubriker.

## Moduler

### Plugglägen (Etapp A)
- **Flashcards** – bläddra och flippa kort, betygsätt med SM-2
- **Skriv** – skriv svaret, Levenshtein-fuzzy-matchning, SM-2 inmatat
- **Matcha** – para ihop 6 frågor med svar på tid; bästa tid sparas
- **Quiz** – flervalsfrågor (fyra alternativ)

### Planering (Etapp B)
- **Planeringsvy** – veckovy (mån–sön) med studiepass per dag
- **Skapa/redigera pass** – titel, kurs (valfri), återkommande/engång, veckodag(ar), tid, längd
- **Markera klart** – grön bock; veckans progress visas i Idag-vyn
- **Idag-vyn** – snabbstart av repetition, dagens studiepass, veckostatistik

### Notiser (Etapp C)
- Daglig repetitionspåminnelse (konfigurerbar tid, hoppas om kön är tom)
- Specifik notis för engångs-studiepass
- Notisinställningar i Profil-vyn

### Fokustimer (Etapp D)
- Pomodoro-timer 25/5 min (justerbart direkt i Fokus-vyn)
- SVG-progressring i highlighter-gult, eller vald kurs färg när en kurs är kopplad
- Kopplas valfritt till kurs; fokussessioner sparas i `focus_sessions`
- Timern överlever bakgrund via `AsyncStorage` + `AppState`
- Veckostatistik för fokustid

### Navigation (Etapp E)
Bottennavigering med fem flikar:
1. **Idag** – dagens repetitioner + studiepass + snabbstartknapp fokus
2. **Kurser** – kurslista → kursdetaljer → plugglägesväljare
3. **Fokus** – Pomodoro-timer
4. **Planera** – veckoplaneringsvyn
5. **Profil** – streak, veckans fokustid, notis- och timerinställningar, utloggning

## Projektstruktur

```
src/
  components/     Återanvändbara komponenter (PrimaryButton, CourseCard, …)
  context/        AuthContext (Supabase-session)
  lib/            supabase.ts, sm2.ts, streak.ts, limits.ts, notifications.ts
  navigation/     AppNavigator (tab- + stack-navigering)
  screens/
    auth/         LoginScreen, RegisterScreen
    courses/      CourseListScreen, CourseScreen, CreateCourseScreen, EditCourseScreen
    flashcards/   CreateFlashcardScreen
    focus/        FocusScreen
    home/         HomeScreen
    mindmap/      MindmapScreen
    plan/         PlanScreen, CreatePlanScreen
    profile/      ProfileScreen
    quiz/         QuizScreen, QuizResultScreen
    review/       ReviewScreen, ReviewCompleteScreen
    study/        StudyModeScreen, WriteScreen, MatchScreen
    summary/      SummaryScreen
    upgrade/      UpgradeScreen
  theme/          tokens.ts (färger, typsnitt, spacing)
supabase/
  schema.sql            Grundschema
  migration_v6_all.sql  Tabeller för match, planering, inställningar, fokus
```
