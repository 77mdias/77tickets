# Agent OS Migration Summary (2026-03-31)

## Objective

Refactor Agent OS guidance to reduce root instruction bloat while preserving TicketFlow-specific architecture rules.

## Changes Applied

- Root `AGENTS.md` reduced to high-signal global rules.
- Added local `AGENTS.md` files for scoped conventions.
- Added reusable repo skills under `.agents-os/SKILLS`.
- Reduced subagents to a minimal, high-value set.
- Added explicit precedence placing Superpowers below repository rules.

## What Moved Out of Root

Moved to local guidance:
- detailed server layer responsibilities
- handler-specific constraints
- application/use-case specifics
- repository-specific persistence boundaries
- UI/app constraints
- test folder strategy details

Moved to skills:
- feature delivery workflow checklist
- explicit TDD cycle workflow
- migration portability checklist

Removed from root:
- verbose/redundant explanatory blocks
- conversational tail artifact

## Current Rule Layering

1. User instruction
2. Root `AGENTS.md`
3. Local scoped `AGENTS.md`
4. Repo skills (`.agents-os/SKILLS/*`)
5. Superpowers/process helpers

## Subagents Kept

- `architect.md` (architecture boundary review)
- `integration.md` (cross-layer flow validation)
- `test.md` (test hardening and regression risk)

## Backup

Pre-refactor backup created:
- `AGENTS.md.backup-2026-03-31-171214`
