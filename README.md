# Unit Calculator

React Native (Expo) scaffold using TypeScript and a clean, feature-oriented architecture.

## Structure

```text
src/
  components/
  screens/
  engine/
    units/
    conversion/
    evaluation/
  parser/
  store/
  utils/
```

## Scripts

- `npm start` - start Expo dev server
- `npm run android` - run on Android
- `npm run ios` - run on iOS
- `npm run web` - run on web
- `npm run typecheck` - run TypeScript checks

## Architecture

- See `docs/ARCHITECTURE.md` for the full mobile unit-calculator design, including tokenizer/parser AST, evaluator, unit algebra via dimension vectors, and post-result conversion flow.
