# Studieassistenten

En React Native-app (Expo + TypeScript) som hjälper studenter att förstå kursmaterial genom AI-genererade sammanfattningar, flashkort, mindmaps och quizfrågor.

## Stack

- **Frontend**: Expo (React Native + TypeScript)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: Claude API (kommande)

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

3. Kör SQL-migrationen i Supabase Dashboard (SQL Editor):
   ```
   supabase/schema.sql
   ```

4. Starta appen:
   ```bash
   npx expo start
   ```

## Datamodell

| Tabell           | Beskrivning                              |
|------------------|------------------------------------------|
| `courses`        | Kurser skapade av användaren             |
| `documents`      | Uppladdade PDF:er kopplade till en kurs  |
| `summaries`      | AI-genererade sammanfattningar           |
| `flashcards`     | Fråga/svar-kort                          |
| `mindmaps`       | Mindmaps (JSON)                          |
| `quiz_questions` | Flervalsfrågejor med rätt svar           |

Alla tabeller har Row Level Security – användare ser bara sin egen data.

## Projektstruktur

```
src/
  context/        AuthContext (Supabase-session)
  lib/            supabase.ts (klientkonfiguration)
  navigation/     AppNavigator (auth-flöde + app-flöde)
  screens/
    auth/         LoginScreen, RegisterScreen
    courses/      CourseListScreen, CreateCourseScreen
supabase/
  schema.sql      Databastabeller + RLS-policies
```

## Tidslinje

| Vecka | Mål |
|-------|-----|
| 1–2   | Expo-projekt, Supabase-integration, auth-flöde, kurs + PDF-upload |
| 3–4   | PDF-parsning, Claude API-integration, sammanfattningar |
| 5–6   | Flashkort + quiz-generering |
| 7–8   | Mindmap-vy, förfinad UI |
| 9–10  | Testning, buggfixar, release-prep |
