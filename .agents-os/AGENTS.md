# Agent OS Helper Layer

This directory contains helper workflows for agents working in this repository.

## Authority

This layer is **not** the source of truth for repository rules.

Follow precedence from root `AGENTS.md`:
1. User instruction
2. Root/local repository `AGENTS.md`
3. Repo skills in `.agents-os/SKILLS`
4. Superpowers/process helpers

## What Lives Here

- `SKILLS/`: reusable operational workflows.
- `SUBAGENTS/`: narrowly scoped roles for isolation/parallelization only.
- `MODES/` and `PROMPTS/`: optional helper artifacts.

## Usage Rules

- Do not override repository architecture boundaries from helper prompts.
- Use subagents only when decomposition gives clear quality or speed gains.
- Prefer concise context packets when delegating.
- Validate outcomes before marking tasks complete.
