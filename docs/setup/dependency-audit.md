# Dependency audit notes

## Current status

`npm audit --omit=dev` currently reports no production vulnerabilities.

The previous audit blocker came from Next.js transitive dependencies:

- `postcss <=8.5.17`;
- `sharp <0.35.0`.

`npm audit fix --force` proposed installing `next@9.3.3`, which is incompatible
with the selected Next.js App Router architecture. Do not use the force fix.

## Applied mitigation

The project keeps Next.js 15 and uses npm overrides for the vulnerable transitive
packages:

```json
{
  "overrides": {
    "next": {
      "postcss": "8.5.25",
      "sharp": "0.35.3"
    }
  }
}
```

Observed dependency tree after `npm install`:

```text
next@15.5.22
├── postcss@8.5.25 overridden
└── sharp@0.35.3 overridden
```

Validation evidence:

```bash
npm audit --omit=dev
npm ls next postcss sharp --all
```

## Follow-up rule

Before production launch, re-check:

```bash
npm audit --omit=dev
npm outdated next postcss sharp
npm run typecheck
npm run lint
npm run test
npm run build
```

If a patched Next.js 15 release removes the need for overrides, prefer removing
the overrides and using the upstream dependency tree.

## Runtime note

`sharp@0.35.3` requires Node.js `>=20.9.0`. The local development environment used
for this audit was Node.js `v26.0.0`.
