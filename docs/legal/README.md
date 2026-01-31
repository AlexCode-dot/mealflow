# Legal pages hosting (GitHub Pages)

This folder contains the Privacy Policy and Terms of Service for MealFlow.

## Publish with GitHub Pages
1) Push this repo to GitHub.
2) In GitHub, open **Settings → Pages** for the repo.
3) Set **Source** to **Deploy from a branch**.
4) Select the branch you want to publish (usually `main`).
5) Set **Folder** to `/docs`.
6) Save.

Once published, your URLs will be:
- `https://<your-username>.github.io/mealflow/legal/privacy`
- `https://<your-username>.github.io/mealflow/legal/terms`
- `https://<your-username>.github.io/mealflow/legal/account-deletion`

## Update the app config
After URLs are live, update:
- `apps/expo-app/app.json` → `expo.extra.legal.privacyUrl`
- `apps/expo-app/app.json` → `expo.extra.legal.termsUrl`
- `apps/expo-app/app.json` → `expo.extra.legal.accountDeletionUrl`

## Notes
- You can also serve these pages from your own domain if preferred.
- Store review requires a **public** privacy policy URL.
