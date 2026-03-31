# AGENTS.md — `tests`

Testing strategy enforces behavior safety and architecture integrity.

## TDD Rule

For feature, bugfix, or behavior change:
1. Write a failing test first.
2. Implement minimum code to pass.
3. Refactor with tests still green.

## Test Scope Guidance

- `tests/unit`: domain rules, use-cases, validation, thin-handler behavior.
- `tests/integration`: route + infrastructure + persistence boundaries.
- `tests/regression`: reproduce and lock previously broken behavior.

## Quality Rules

- Test behavior and invariants, not implementation trivia.
- Add regression tests for every bug fix.
- Keep tests explicit, deterministic, and high signal.
