# Calendar ToDo

A simple calendar-based ToDo app with an Apple-inspired visual style.

## Features

- Monthly calendar
- Three-day task view from the selected date
- Task creation, completion, and deletion
- Supabase storage when configured
- localStorage fallback when Supabase is not configured

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL Editor and run the SQL in `supabase-schema.sql`.
3. Go to Project Settings > API.
4. Copy your Project URL and anon public key.
5. Edit `config.js`.

```js
window.SUPABASE_CONFIG = {
  url: "https://xxxx.supabase.co",
  anonKey: "your-anon-public-key",
};
```

When `config.js` still has placeholder values, the app saves tasks in the current browser with `localStorage`.

## GitHub Pages

In the repository, open Settings > Pages and publish the `main` branch from `/root`.

## Security Note

The included Supabase policy is for a shared public task list. Anyone with the app URL can read and write the same tasks.

For per-user private tasks, add Supabase Auth and user-scoped Row Level Security policies.
