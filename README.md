# Unit Calculator

Unit Calculator is an Expo + React Native calculator for mixed numeric and unit-aware expressions. It lets you type expressions such as `8mm * 6664541mm`, evaluate them through a small parser/evaluator pipeline, and then switch compatible output units from the result view.

The app currently uses a single in-screen flow rather than a navigation stack: the main calculator lives in `HomeScreen`, and History, Settings, About, and Privacy are rendered as local pages inside that screen.

## Current Features

- Unit-aware expression input with a custom parser and evaluator
- Quick unit insertion from a bottom sheet
- Result unit switching for compatible dimensions
- Shortened result formatting for long decimals and very large/small values
- Generic `err` display for invalid expressions
- Expandable keypad via the `More` button
- Overflow menu with `History` and `Settings`
- Full-screen history page with up to 20 recent entries
- Tap a successful history item to insert its stored result back into the calculator input
- Settings page with version, About, and Privacy content

## Project Structure

```text
src/
  engine/
    conversion/
    evaluation/
    units/
  parser/
  screens/
    HomeScreen.tsx
  utils/
docs/
  ARCHITECTURE.md
```

## Architecture

High-level flow:

```text
HomeScreen -> parse(expression) -> evaluateExpression(parsed, units) -> format/display result
```

- `src/parser` tokenizes calculator input and builds the expression structure.
- `src/engine/units` defines units, dimension vectors, and base conversion factors.
- `src/engine/evaluation` evaluates parsed expressions into numeric values plus dimensions.
- `src/engine/conversion` contains standalone conversion helpers.
- `src/screens/HomeScreen.tsx` owns the React Native UI, calculator state, history, page switching, and result formatting.

More detail lives in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Getting Started

### Prerequisites

- Node.js
- npm
- Expo-compatible mobile tooling if you want to run on a device or emulator

### Install

```bash
npm install
```

On this Windows setup, `npm.ps1` can be blocked by PowerShell execution policy. If that happens, use `npm.cmd` instead:

```powershell
npm.cmd install
```

## Scripts

- `npm start` or `npm.cmd start`: start the Expo dev server
- `npm run android` or `npm.cmd run android`: run on Android
- `npm run ios` or `npm.cmd run ios`: run on iOS
- `npm run web` or `npm.cmd run web`: run on web
- `npm run typecheck` or `npm.cmd run typecheck`: run TypeScript checks

## History Behavior

- History keeps the 20 most recent entries.
- Each entry stores the displayed result and, for successful calculations, a parse-safe token version that can be reinserted into the calculator.
- History rows showing `err` are not reusable because they do not map to valid calculator input.

## Notes

- Result formatting is intentionally display-focused: long decimal noise is trimmed, and scientific notation is used when values would otherwise become unwieldy.
- Invalid or unsupported expressions intentionally surface only as `err` in the UI.
- The app currently keeps navigation local to `HomeScreen` instead of using React Navigation.
