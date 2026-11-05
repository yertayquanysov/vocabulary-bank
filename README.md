# Vocabulary Bank

A small React app for collecting words you're learning. Sign in with your email
and password, add a word, mark it as **New**, **Learning**, or **Mastered**, then
filter, search, and study your collection with flashcards.

Each word has one **explanation** field: English and Russian meanings plus a few
example sentences in both languages. Gemini can generate it for you, and you can
always edit the text by hand.

## Features

- Email + password sign-in — no sign-up form
- One shared bank: every signed-in account sees and edits the same words
- Anonymous visitors cannot read or write anything (enforced by RLS)
- Add a word with an optional explanation
- Generate or regenerate an explanation with Gemini: English + Russian meanings
  and example sentences
- Edit the generated explanation directly on the add form
- Choose a status when adding: New, Learning, or Mastered
- Change any word's status from its card
- Flashcard study mode: reveal the explanation, then choose **Know** or
  **Don't know**
- Filter by status and search words or explanations
- Mastery progress indicator
- Duplicate-word guard and delete action
- Responsive layout, keyboard-friendly controls
- Supabase storage (with a local-only fallback)

## Gemini explanations

1. Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Open the app and paste the key into **Gemini generation → Add API key**.
3. Type a word and press **Generate with Gemini**, or use **Generate** on any
   word card to fill in a missing explanation.

The key is stored in this browser's `localStorage` under
`vocabulary-bank.gemini-key` and is sent directly to Google. It is never written
to Supabase. Generated text looks like this and stays fully editable:

```text
English
Meaning: …
Examples:
- …
- …

Russian
Meaning: …
Examples:
- …
- …
```

## Study mode

Open **Study flashcards** from the progress card. Each session shuffles every
word in the bank. Tap a card to reveal its explanation, then grade yourself:

| Button | Status written to the database |
| --- | --- |
| **Know** | `mastered` |
| **Don't know** | `learning` |

The status change is saved immediately, so the word cards and mastery progress
reflect it as soon as you return to the bank.

## Storage

The app has two modes:

- **Supabase** — used when `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`) are set.
  Users sign in with email and password, and words live in the shared `words`
  table.
- **Local** — used when those variables are missing. No sign-in is required and
  words are saved to `localStorage`.

The footer shows which mode is active, along with the signed-in email.

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`).

## Deploy to GitHub Pages

The app is deployed at:

**https://yertayquanysov.github.io/vocabulary-bank/**

Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
which builds the app and publishes `dist` to GitHub Pages. The Vite `base` path
is derived from `GITHUB_REPOSITORY`, so project sites work without hardcoding
the repository name.

The build reads two repository variables (Settings → Secrets and variables →
Actions → Variables):

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Both values are public by design — the publishable key is already shipped to
every browser — so they are stored as variables, not secrets.

Password sign-in does not need a redirect URL, so no Pages URL configuration is
required in Supabase.

## Supabase setup

The schema lives in [`supabase/schema.sql`](supabase/schema.sql). It defines the
`words` table with one merged `explanation` column, RLS policies, and an
`updated_at` trigger.

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

3. In **Authentication → Sign In / Providers → Email**, turn off **Allow new
   users to sign up**. The app does not call `signUp`, but this closes the public
   signup endpoint too.

4. In **Authentication → Users → Add user**, create an account for each person
   who should have access. Set a password and enable **Auto Confirm User** so
   they can sign in immediately.

5. Restart the dev server so Vite picks up the environment variables.

### Auth model

- The app calls `signInWithPassword`; there is no registration screen.
- New accounts and password resets are handled by the owner in the Supabase
  dashboard.
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
