# MIG-007 Portability Proof

## Isolation approach used

I created a disposable workspace and copied only the files needed to type-check the portable server layers:

- `src/server/domain/**`
- `src/server/application/**`
- `src/server/repositories/**` contract files, but not the Drizzle implementations

In the temp workspace, `src/server/repositories/index.ts` was replaced by a contract-only barrel to avoid pulling infrastructure adapters into the proof graph.

## Exact commands

```bash
set -euo pipefail
workspace=$(mktemp -d /tmp/mig-007-portability-XXXXXX)
echo "$workspace"
mkdir -p "$workspace/src/server"
find src/server/domain src/server/application src/server/repositories -type f -name '*.ts' ! -path 'src/server/repositories/drizzle/*' -print0 | while IFS= read -r -d '' file; do
  mkdir -p "$workspace/$(dirname "$file")"
  cp "$file" "$workspace/$file"
done
cat > "$workspace/src/server/repositories/index.ts" <<'EOF'
export * from "./common.repository.contracts";
export * from "./event.repository.contracts";
export * from "./lot.repository.contracts";
export * from "./order.repository.contracts";
export * from "./ticket.repository.contracts";
export * from "./coupon.repository.contracts";
export * from "./persistence-error";
EOF
cat > "$workspace/tsconfig.json" <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowJs": false
  },
  "include": ["src/server/domain/**/*.ts", "src/server/application/**/*.ts", "src/server/repositories/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF
./node_modules/.bin/tsc -p "$workspace/tsconfig.json" --noEmit
echo "MIG007_TSC_OK"
```

## Execution history

### Attempt 1 (before fixes)

Result: **Fail**

Errors found in application layer:

1. `src/server/application/use-cases/create-coupon.use-case.ts:20`
   - `CreateCouponUseCase` promised `CouponGovernanceResult.maxRedemptions: number`
   - Implementation returned `created.maxRedemptions` typed as `number | null`

2. `src/server/application/use-cases/create-order.use-case.ts:258`
   - Telemetry `errorCode` union excluded `"unauthenticated"`
   - `isAppError(error)` can emit `"unauthenticated"`, causing a type mismatch

### Applied fixes

- `create-coupon.use-case.ts`: return `maxRedemptions: created.maxRedemptions ?? input.maxRedemptions`
- `create-order.use-case.ts`: expanded telemetry `errorCode` union to include `"unauthenticated"`

### Attempt 2 (after fixes)

Result: **Pass**

Observed output:

```bash
/tmp/mig-007-portability-I6ba0P
MIG007_TSC_OK
```

## Unexpected dependencies found

- `src/server/repositories/index.ts` re-exports `./drizzle`, so a naive compile of the portable layers would pull infrastructure adapters and `drizzle-orm` into the type graph.
- `AppError`/`PersistenceError` rely on ES2022 `ErrorOptions`, so the isolated compiler target must include ES2022 libs.

## Conclusion for MIG-007 acceptance

MIG-007 is **accepted**.

`domain + application` compile in isolated context with `tsc --noEmit` and no type errors after the targeted portability fixes.
