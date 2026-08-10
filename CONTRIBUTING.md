# Contributing

## Before pushing

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm export:web
```

CI runs the same three checks on every pull request. Merging to `main` deploys to Cloudflare Pages
automatically.

## Things worth knowing

- `packages/domain/src/generated/*` is produced by `scripts/*-codegen.mjs` from `data/governed/*`.
  Regenerate; never hand-edit.
- The lookup rules in `CLAUDE.md` under "Rules that protect correctness" exist because breaking them
  shows a clinician the wrong drug. If you change lookup behavior, add the negative test with it.
- The UI uses React Native primitives through `react-native-web`. Types for those live in
  `apps/clinician/src/react-native-web.d.ts`.
