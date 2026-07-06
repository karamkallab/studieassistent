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
- Pomodoro-timer 25/5 min (justerbart i Profil)
- SVG-progressring i highlighter-gult/sage
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
