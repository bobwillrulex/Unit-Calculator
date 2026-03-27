# Mobile Unit Calculator Architecture

## Design goals

- Keep the **math engine independent** from React Native and presentation concerns.
- Keep **parsing/evaluation/conversion** as separate modules with narrow contracts.
- Keep formatting and localization in UI/application layer only.
- Always compute in canonical base units internally and convert only for display/output.

## Layered architecture

```text
┌───────────────────────────────────────────────────────────────────┐
│ UI Layer (React Native screens/components, state/store)          │
│ - input field, keypad, unit pickers, error display, result card  │
│ - calls use cases and receives plain data                         │
└───────────────────────────────┬───────────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────────┐
│ Application Layer (orchestration / use-cases)                    │
│ - tokenize+parse                                                   │
│ - evaluate to Quantity(base units + dimension vector)            │
│ - convert for display target unit                                │
│ - map domain errors -> UI-safe error messages                    │
└───────────────────────────────┬───────────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────────┐
│ Math Engine (pure domain, no UI imports)                         │
│  parser/      engine/evaluation/      engine/units/ conversion/  │
│  - tokenizing - AST walk             - dimension algebra          │
│  - syntax     - unit semantics       - unit registry              │
│                - base-unit math      - conversion checks          │
└───────────────────────────────────────────────────────────────────┘
```

## Core modules

### 1) Expression parsing (Tokenizer + AST Parser)

Responsibilities:

- Convert raw input text into tokens (`number`, `identifier`, operators, parentheses).
- Build AST with precedence/associativity.
- Return parser diagnostics (unexpected token, incomplete expression, etc.).

Notes:

- Parser should be deterministic and side-effect free.
- Parser should not look up unit conversion factors; it only understands syntax and symbols.

### 2) Evaluation engine

Responsibilities:

- Walk AST and compute a `Quantity`.
- `Quantity` should include:
  - numeric value in base units
  - dimension vector
- Enforce operation rules:
  - `+`/`-` require dimension equality
  - `*`/`/` combine dimensions algebraically
  - `^` applies exponent to both value and dimension vector

Notes:

- Evaluator receives a unit registry/context injected from outside.
- Evaluator throws/returns domain errors (dimension mismatch, unknown unit, divide-by-zero).

### 3) Unit algebra (dimension vectors)

Responsibilities:

- Represent dimensions as exponent vectors over base dimensions.
- Provide pure operations: multiply, divide, pow, equality.

Dimension example:

- meter: `[L=1, M=0, T=0, I=0, Θ=0, N=0, J=0]`
- second: `[0,0,1,0,0,0,0]`
- velocity m/s: `[1,0,-1,0,0,0,0]`

### 4) Conversion system (post-result)

Responsibilities:

- Convert only after evaluation result exists in base units.
- Verify target unit dimension equals result dimension.
- Apply scale/offset policies as needed.

Recommended conversion model:

- For linear units: `display = base / toBaseScale`
- For affine units (e.g., temperature), support `base = a*x + b` and inverse.

### 5) UI layer

Responsibilities:

- Input capture and editing interactions.
- Unit selection controls.
- Calling application use-case and rendering returned view-model.
- Number formatting, locale formatting, and text presentation.

Rules:

- UI never performs parsing, dimension math, or conversion formulas directly.
- UI receives plain data (`value`, `unitSymbol`, `errorCode`) and formats it.

## Data flow (required)

```text
Input
  → Tokenizer
  → Parser (AST)
  → Evaluator
  → Result (base units)
  → Display Conversion
```

Detailed flow:

1. User enters expression (e.g., `5 km / 2 h`).
2. Tokenizer emits tokens.
3. Parser builds AST.
4. Evaluator walks AST using unit registry:
   - resolves `km`, `h`
   - computes base value + dimension vector
   - yields quantity in SI/base form
5. Conversion engine converts base quantity to selected display unit (`m/s`, `km/h`, etc.).
6. UI formats numeric output and presents final string.

## Separation rules (hard constraints)

1. `src/engine/**` and `src/parser/**` must not import from `react-native`, screens, components, or UI store.
2. Formatting (rounding strings, locale separators, symbol spacing) must be outside evaluation/conversion logic.
3. Domain modules return structured values and error codes, not human-facing messages.
4. Application layer maps domain data to UI view-model.

## Suggested directory ownership

```text
src/
  parser/               # tokenizer/parser/ast/error types
  engine/
    units/              # dimension vectors, registry, algebra
    evaluation/         # ast evaluator, semantic checks
    conversion/         # quantity -> target unit conversion
  store/                # ui/app state only
  screens/              # react-native presentation only
  components/           # reusable presentational pieces
  app/                  # orchestration/use-cases (recommended add)
```

## Recommended public contracts

- `Tokenizer.tokenize(input) -> Token[]`
- `ExpressionParser.parse(input) -> ParsedExpression`
- `ExpressionEvaluator.evaluate(parsedExpression, context) -> Quantity`
- `ConversionEngine.convert(quantityInBaseUnits, toUnit) -> ConversionResult`

These contracts enforce the intended one-way data flow and keep domain logic reusable for mobile, web, and tests.
