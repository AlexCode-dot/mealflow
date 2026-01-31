# App Store + Google Play release checklist (MealFlow)

## App identity
- App name, subtitle, and category chosen
- iOS bundle id set to `com.mealflow.app`
- Android package set to `com.mealflow.app`
- Version set in `apps/expo-app/app.json`
- Build numbers set (iOS `buildNumber`, Android `versionCode`)

## Branding assets
- App icon (1024x1024 PNG)
- Android adaptive icons (foreground/background + optional monochrome)
- Splash image added and referenced in `apps/expo-app/app.json`
- Store listing screenshots (required sizes for iOS + Android)

## Screenshot plan (suggested)
- Overview / dashboard
- Weekly Planner (calendar/week view)
- Recipes list with filters
- Recipe detail
- Shopping list overview
- Settings or Profile (legal + account deletion visible)

## Legal + support
- Privacy Policy published at a public URL
- Terms of Service published at a public URL
- Account deletion URL published (or in-app deletion available)
- Support email and/or support URL ready
- In-app links to Privacy Policy + Terms work

## App Store Connect (iOS)
- App created in App Store Connect
- Bundle id registered in Apple Developer Portal
- App information filled (name, subtitle, category, age rating)
- Privacy details completed (data types + tracking)
- Screenshots uploaded
- TestFlight build uploaded and reviewed

## Google Play Console (Android)
- App created in Play Console
- Data safety form completed
- Store listing filled (title, description, graphics, screenshots)
- App content rating completed
- Release build uploaded (AAB)

## EAS build + submit
- `apps/expo-app/eas.json` configured
- EAS credentials set for iOS + Android
- `eas build -p ios --profile production`
- `eas build -p android --profile production`
- `eas submit -p ios --profile production`
- `eas submit -p android --profile production`

## Final QA
- Check account creation and login
- Verify key flows (create plan, create recipe, shopping list)
- Check offline/poor network behavior
- Ensure no placeholder text or debug UI
- Confirm crash-free in release build
