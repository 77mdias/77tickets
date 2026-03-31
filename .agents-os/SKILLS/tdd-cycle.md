# Skill: TDD Cycle (TicketFlow)

Use for feature, bugfix, or behavior change.

## Red-Green-Refactor

1. Red: add one focused failing test.
2. Verify Red: run only the new/affected test and confirm expected failure.
3. Green: implement the smallest change to pass.
4. Verify Green: rerun affected tests.
5. Refactor: improve code while preserving behavior.
6. Run relevant unit/integration/regression set based on risk.

## Test Selection

- `tests/unit` for domain/use-case/handler behavior.
- `tests/integration` for route + persistence flows.
- `tests/regression` for reproduced historical bugs.
