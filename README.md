# Vocabulary Bank

A small React app for collecting words you're learning. Sign in with your
email, add a word with a meaning and an optional example sentence, mark it as
**New**, **Learning**, or **Mastered**, then filter and search your collection.

## Features

- Email sign-in via magic link — no password, no sign-up form
- One shared bank: every signed-in account sees and edits the same words
- Anonymous visitors cannot read or write anything (enforced by RLS)
- Add a word with a required meaning and optional example sentence
- Choose a status when adding: New, Learning, or Mastered
- Change any word's status from its card
- Filter by status and search words, meanings, or examples
- Mastery progress indicator
- Duplicate-word guard and delete action
- Responsive layout, keyboard-friendly controls
- Supabase storage (with a local-only fallback)

## Storage

The app has two modes:

- **Supabase** — used when `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`) are set.
  Users sign in with a magic link, and words live in the shared `words` table.
- **Local** — used when those variables are missing. No sign-in is required and
  words are saved to `localStorage`.

The footer shows which mode is active, along with the signed-in email.

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`).

## Supabase setup

The schema lives in [`supabase/schema.sql`](supabase/schema.sql). It defines the
`words` table, RLS policies, and an `updated_at` trigger.

1. Run the SQL in the Supabase SQL editor (or apply it as a migration).
2. Copy the example env file and fill in your project values from **Project
   Settings → API**:

   ```bash
   cp .env.example .env
   ```

   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
   ```

3. In **Authentication → URL Configuration**, set the **Site URL** to your app
   URL and add it to **Redirect URLs**, for example:

   ```
   http://localhost:5173/**
   ```

   The magic link only returns to an allowed URL.

4. In **Authentication → Sign In / Providers → Email**, turn off **Allow new
   users to sign up**. The app already sends `shouldCreateUser: false`, but
   this closes the public signup endpoint too.

5. In **Authentication → Users → Add user**, create an account for each person
   who should have access. Enable **Auto Confirm User** so they can sign in
   immediately.

6. Restart the dev server so Vite picks up the environment variables.

### Auth model

- The app calls `signInWithOtp` with `shouldCreateUser: false`, so unknown
  emails are rejected. There is no registration screen.
- New accounts must be created by the owner in the Supabase dashboard.
- RLS is enabled with policies for the `authenticated` role only. The `anon`
  role has no policies, so it cannot read or write the table.
- The bank is shared: any signed-in account can read, add, update, and delete
  any word. If you later need private banks per user, add a `user_id` column and
  scope the policies with `auth.uid() = user_id`.

## Build

```bash
npm run build
npm run preview
```
