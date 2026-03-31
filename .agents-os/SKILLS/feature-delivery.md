# Skill: Feature Delivery (TicketFlow)

Use for new features or significant behavior updates.

## Steps

1. Confirm business objective and acceptance criteria.
2. Identify impacted layer(s) and local `AGENTS.md` constraints.
3. Define or update contracts/schemas first.
4. Write failing test for the next behavior increment.
5. Implement minimum change in the correct layer.
6. Keep handlers thin and business logic in use-cases/domain.
7. Run affected test suites.
8. Refactor for clarity without changing behavior.
9. Document relevant delivery updates.

## Guardrails

- Do not bypass repository contracts.
- Do not trust client-sensitive data.
- Do not introduce framework coupling into domain/application.
