# Unit Calculator Architecture

The app is intentionally small and direct:

```text
HomeScreen -> parse(expression) -> evaluateExpression(parsed, units) -> display result
```

## Source layout

- `src/parser` tokenizes input and builds a tiny AST.
- `src/engine/units` owns unit definitions, dimension math, and base-unit conversion helpers.
- `src/engine/evaluation` evaluates the AST against the unit registry.
- `src/engine/conversion` exposes standalone unit-to-unit conversion helpers.
- `src/screens/HomeScreen.tsx` owns the React Native UI, input tokens, recent history, and result formatting.

## Rules

- Parser and engine files stay framework-free; they do not import React Native.
- Values are evaluated in base units first, then formatted for display.
- Keep APIs as functions and plain types unless an abstraction has multiple real implementations.
