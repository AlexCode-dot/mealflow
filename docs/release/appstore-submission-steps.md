# App Store submission steps (MealFlow)

## 1) Publish legal pages (GitHub Pages)
- Repo Settings → Pages
- Source: Deploy from a branch
- Branch: `main`
- Folder: `/docs`
- URLs:
  - https://alexcode-dot.github.io/mealflow/legal/privacy
  - https://alexcode-dot.github.io/mealflow/legal/terms
  - https://alexcode-dot.github.io/mealflow/legal/account-deletion

## 2) Fill store listing metadata
Use: `docs/release/store-metadata-template.md`

## 3) Configure App Store Connect
- Create app in App Store Connect
- Bundle ID: `com.mealflow.app`
- App name: MealFlow
- Category + age rating
- Upload screenshots
- Add support URL + privacy policy URL
- Complete privacy “nutrition labels”

## 4) Configure EAS Submit (optional)
Edit `apps/expo-app/eas.json`:
- appleId
- ascAppId
- appleTeamId

## 5) Build release
From `apps/expo-app`:
- `eas build -p ios --profile production`

## 6) Submit build
- `eas submit -p ios --profile production`

## 7) Final review checklist
- Legal URLs live and accessible
- Delete account works end‑to‑end
- No placeholder assets or text
- Release build tested on device
