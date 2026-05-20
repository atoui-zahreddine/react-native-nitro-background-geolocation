# Monorepo Restructure Implementation Plan

> **Status: ✅ Completed** — branch `chore/monorepo-restructure`. All structural and CI tasks landed. Native builds (Tasks 8 + 9) and the push/PR step (Task 14.4) were deferred to manual / CI verification by request.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the flat repo into a Yarn-workspaces monorepo with `packages/` (library) and `apps/` (example app + new Docusaurus docs site), following the Nitro Modules layout.

**Architecture:** Yarn 4 workspaces + Turborepo. The publishable library moves into `packages/react-native-nitro-background-geolocation/` with its podspec, nitrogen config, Expo plugin, and bob build config. The example app moves to `apps/example/` and is rewired to depend on the library via workspace `"*"` resolution, dropping `react-native-monorepo-config` in favor of standard Metro `watchFolders` + `extraNodeModules`. A new Docusaurus site is scaffolded at `apps/docs/` and deployed to GitHub Pages via a new workflow.

**Tech Stack:** Yarn 4, Turborepo, react-native-builder-bob, Nitrogen, Expo, Metro, CocoaPods, Docusaurus, GitHub Actions.

---

## Background

Decisions for this plan are documented in [docs/adr/0003-monorepo-with-yarn-workspaces.md](../../adr/0003-monorepo-with-yarn-workspaces.md). The shape of the final tree:

```
/
├── apps/
│   ├── example/                        ← moved from /example
│   └── docs/                           ← new Docusaurus site
├── packages/
│   └── react-native-nitro-background-geolocation/
│       ├── src/
│       ├── ios/
│       ├── android/
│       ├── nitrogen/
│       ├── nitro.json
│       ├── NitroBackgroundGeolocation.podspec
│       ├── app.plugin.js
│       ├── babel.config.js
│       ├── tsconfig.json
│       ├── tsconfig.build.json
│       ├── react-native.config.js
│       └── package.json
├── docs/
│   ├── adr/                            ← project ADRs (unchanged)
│   ├── ios-killed-state-validation.md  ← unchanged
│   └── superpowers/                    ← unchanged
├── .github/
│   ├── actions/setup/
│   └── workflows/
│       ├── ci.yml
│       └── deploy-docs.yml             ← new
├── turbo.json
├── tsconfig.json                       ← base config that workspaces extend
├── package.json                        ← workspace orchestrator
├── eslint.config.mjs
├── lefthook.yml
└── ...
```

## File Structure (responsibilities)

| Path | Responsibility |
|---|---|
| Root `package.json` | Workspaces declaration, Turbo/lefthook/commitlint dev deps, orchestration scripts. Private — never published. |
| Root `tsconfig.json` | Shared base TypeScript config. Workspaces extend it. |
| Root `turbo.json` | Task pipeline definitions referencing workspace paths. |
| Root `eslint.config.mjs` | Repo-wide ESLint config. Globs updated for new structure. |
| Root `lefthook.yml` | Pre-commit hooks. Path globs updated. |
| `packages/react-native-nitro-background-geolocation/package.json` | The publishable npm package. Owns `name`, `version`, `main`, `exports`, `files`, `peerDependencies`, `react-native-builder-bob`. |
| `packages/.../nitrogen/`, `nitro.json` | Nitrogen code-generator inputs and outputs for this library. |
| `packages/.../app.plugin.js` | Expo config plugin entry — referenced by the example's `app.json`. |
| `apps/example/package.json` | Example app workspace. Depends on the library via `"workspace:*"`. |
| `apps/example/metro.config.js` | Hand-rolled Metro config: monorepo root in `watchFolders`, peer-dep aliases in `extraNodeModules`. |
| `apps/example/babel.config.js` | Uses bob's babel config helper, but relative paths updated to point at the package. |
| `apps/example/react-native.config.js` | Tells RN CLI where the library's native code lives (cross-workspace path). |
| `apps/docs/package.json` | Docusaurus workspace. Private. |
| `apps/docs/docusaurus.config.js` | Docusaurus site config — title, GitHub Pages URL, repo links. |
| `.github/workflows/deploy-docs.yml` | Builds `apps/docs` and deploys to GitHub Pages on push to `main`. |

## Pre-flight

This restructure touches almost every file. Execute it in a feature branch, not on `main`.

- [ ] **Step 0.1: Create a feature branch**

Run:
```bash
git checkout -b chore/monorepo-restructure
```

Expected: `Switched to a new branch 'chore/monorepo-restructure'`

- [ ] **Step 0.2: Verify clean working tree**

Run:
```bash
git status
```

Expected: `nothing to commit, working tree clean`. If not, stash or commit first.

- [ ] **Step 0.3: Capture baseline that things work today**

Run:
```bash
yarn install
yarn lint
yarn typecheck
yarn prepare
```

Expected: All four succeed. This is the "green" we need to restore at the end.

---

## Phase 1: Move the library into `packages/`

### Task 1: Create the package directory and move library files

**Files:**
- Create: `packages/react-native-nitro-background-geolocation/` (directory)
- Move into it: `src/`, `ios/`, `android/`, `nitrogen/`, `nitro.json`, `NitroBackgroundGeolocation.podspec`, `app.plugin.js`, `babel.config.js`, `tsconfig.build.json`, `lib/` (if it exists)
- Keep at root: `tsconfig.json` (will be edited), `package.json` (will be edited), `turbo.json`, `eslint.config.mjs`, `lefthook.yml`, `docs/`, `.github/`, `.yarn/`, `.yarnrc.yml`

- [ ] **Step 1.1: Create directories**

Run:
```bash
mkdir -p packages/react-native-nitro-background-geolocation
mkdir -p apps
```

- [ ] **Step 1.2: Move library files using `git mv` so history is preserved**

Run from repo root:
```bash
git mv src packages/react-native-nitro-background-geolocation/src
git mv ios packages/react-native-nitro-background-geolocation/ios
git mv android packages/react-native-nitro-background-geolocation/android
git mv nitrogen packages/react-native-nitro-background-geolocation/nitrogen
git mv nitro.json packages/react-native-nitro-background-geolocation/nitro.json
git mv NitroBackgroundGeolocation.podspec packages/react-native-nitro-background-geolocation/NitroBackgroundGeolocation.podspec
git mv app.plugin.js packages/react-native-nitro-background-geolocation/app.plugin.js
git mv babel.config.js packages/react-native-nitro-background-geolocation/babel.config.js
git mv tsconfig.build.json packages/react-native-nitro-background-geolocation/tsconfig.build.json
```

If `lib/` exists (build output, gitignored), don't `git mv` it — just remove it; bob will regenerate later:
```bash
rm -rf lib
```

- [ ] **Step 1.3: Move the example app to `apps/example`**

Run:
```bash
git mv example apps/example
```

- [ ] **Step 1.4: Verify the moves**

Run:
```bash
ls packages/react-native-nitro-background-geolocation
ls apps/example
git status --short | head -40
```

Expected: package dir contains `src/`, `ios/`, `android/`, `nitrogen/`, `nitro.json`, podspec, plugin, babel.config.js, tsconfig.build.json. apps/example contains everything that was in `example/`. `git status` shows the renames.

- [ ] **Step 1.5: Commit the raw moves before changing any contents**

This makes the move-vs-edit history clean and reviewable.

Run:
```bash
git add -A
git commit -m "chore(monorepo): move library to packages/ and example to apps/

File moves only — no content changes. Subsequent commits will wire up
the new structure (package.json, tsconfig, build, CI, etc.)."
```

---

### Task 2: Create the package's `package.json`

**Files:**
- Create: `packages/react-native-nitro-background-geolocation/package.json`

This file owns everything publishable. The root `package.json` will be rewritten in Task 3 to become a pure workspace orchestrator.

- [ ] **Step 2.1: Write the new package `package.json`**

Create `packages/react-native-nitro-background-geolocation/package.json` with this exact content:

```json
{
  "name": "react-native-nitro-background-geolocation",
  "version": "0.1.0",
  "description": "React native nitro module for background geolocation",
  "main": "./lib/module/index.js",
  "types": "./lib/typescript/src/index.d.ts",
  "exports": {
    ".": {
      "source": "./src/index.tsx",
      "types": "./lib/typescript/src/index.d.ts",
      "default": "./lib/module/index.js"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "src",
    "lib",
    "android",
    "ios",
    "cpp",
    "nitrogen",
    "nitro.json",
    "app.plugin.js",
    "*.podspec",
    "react-native.config.js",
    "!ios/build",
    "!android/build",
    "!android/gradle",
    "!android/gradlew",
    "!android/gradlew.bat",
    "!android/local.properties",
    "!**/__tests__",
    "!**/__fixtures__",
    "!**/__mocks__",
    "!**/.*"
  ],
  "scripts": {
    "clean": "del-cli lib",
    "prepare": "bob build",
    "nitrogen": "nitrogen",
    "typecheck": "tsc",
    "lint": "eslint \"**/*.{js,ts,tsx}\""
  },
  "keywords": [
    "react-native",
    "ios",
    "android"
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/atoui-zahreddine/react-native-nitro-background-geolocation.git"
  },
  "author": "Zahreddine Atoui <at.zahreddine@gmail.com> (https://github.com/atoui-zahreddine)",
  "license": "(MIT AND Apache-2.0)",
  "bugs": {
    "url": "https://github.com/atoui-zahreddine/react-native-nitro-background-geolocation/issues"
  },
  "homepage": "https://github.com/atoui-zahreddine/react-native-nitro-background-geolocation#readme",
  "publishConfig": {
    "registry": "https://registry.npmjs.org/"
  },
  "devDependencies": {
    "@react-native/babel-preset": "0.85.0",
    "@types/react": "^19.2.0",
    "del-cli": "^7.0.0",
    "nitrogen": "^0.35.6",
    "react": "19.2.0",
    "react-native": "0.83.6",
    "react-native-builder-bob": "^0.41.0",
    "react-native-nitro-modules": "^0.35.6",
    "typescript": "^6.0.2"
  },
  "peerDependencies": {
    "react": "*",
    "react-native": "*",
    "react-native-nitro-modules": "^0.35.6"
  },
  "react-native-builder-bob": {
    "source": "src",
    "output": "lib",
    "targets": [
      [
        "custom",
        {
          "script": "nitrogen",
          "clean": "nitrogen/"
        }
      ],
      [
        "module",
        {
          "esm": true
        }
      ],
      [
        "typescript",
        {
          "project": "tsconfig.build.json"
        }
      ]
    ]
  },
  "create-react-native-library": {
    "type": "nitro-module",
    "languages": "kotlin-swift",
    "tools": [
      "eslint",
      "lefthook"
    ],
    "version": "0.62.0"
  }
}
```

Notes on what changed from the original root `package.json`:
- Removed `workspaces` (moves to root)
- Removed `packageManager` (moves to root)
- Removed `prettier`, `commitlint` blocks (move to root)
- Removed `example` script (root now has the `yarn example` shortcut)
- Removed `turbo`, `lefthook`, `commitlint`, `prettier`, `eslint*`, `@eslint/*`, `eslint-*`, `@commitlint/*`, `eslint-plugin-*`, `@react-native/eslint-config` (move to root devDeps — they're workspace-wide tooling)
- Kept everything else (the `react-native-builder-bob` block, scripts, peer deps)

- [ ] **Step 2.2: Create the package's `react-native.config.js`**

Create `packages/react-native-nitro-background-geolocation/react-native.config.js`:

```js
module.exports = {
  dependencies: {
    'react-native-nitro-background-geolocation': {
      platforms: {
        ios: {},
        android: {},
      },
    },
  },
};
```

This file ships in the package and tells consumer apps' RN CLI how to autolink it.

- [ ] **Step 2.3: Create the package's `tsconfig.json`**

Create `packages/react-native-nitro-background-geolocation/tsconfig.json`:

```json
{
  "extends": "../../tsconfig",
  "compilerOptions": {
    "rootDir": ".",
    "paths": {
      "react-native-nitro-background-geolocation": ["./src/index"]
    }
  }
}
```

This pulls in the shared compiler options from root and locks the path alias to the package's own `src`.

- [ ] **Step 2.4: Update the package's `tsconfig.build.json`**

The file is already in the package dir. Verify its contents:

```json
{
  "extends": "./tsconfig",
  "exclude": ["lib"]
}
```

The original excluded `"example"`, but `example/` is no longer a sibling — remove it from the exclude list.

- [ ] **Step 2.5: Commit**

```bash
git add packages/react-native-nitro-background-geolocation/package.json \
        packages/react-native-nitro-background-geolocation/react-native.config.js \
        packages/react-native-nitro-background-geolocation/tsconfig.json \
        packages/react-native-nitro-background-geolocation/tsconfig.build.json
git commit -m "chore(monorepo): add package-level config files for the library"
```

---

### Task 3: Rewrite root `package.json` as workspace orchestrator

**Files:**
- Modify: `package.json`

- [ ] **Step 3.1: Overwrite the root `package.json` with this content**

```json
{
  "name": "react-native-nitro-background-geolocation-monorepo",
  "version": "0.0.0",
  "private": true,
  "description": "Monorepo for react-native-nitro-background-geolocation",
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "example": "yarn workspace react-native-nitro-background-geolocation-example",
    "docs": "yarn workspace react-native-nitro-background-geolocation-docs",
    "lib": "yarn workspace react-native-nitro-background-geolocation",
    "clean": "turbo run clean",
    "prepare": "turbo run prepare",
    "nitrogen": "yarn lib nitrogen",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "build:android": "turbo run build:android",
    "build:ios": "turbo run build:ios"
  },
  "devDependencies": {
    "@commitlint/config-conventional": "^20.5.0",
    "@eslint/compat": "^2.0.3",
    "@eslint/eslintrc": "^3.3.5",
    "@eslint/js": "^10.0.1",
    "@react-native/eslint-config": "0.85.0",
    "commitlint": "^20.5.0",
    "eslint": "^9.39.4",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-ft-flow": "^3.0.11",
    "eslint-plugin-prettier": "^5.5.5",
    "lefthook": "^2.1.4",
    "prettier": "^3.8.1",
    "turbo": "^2.8.21",
    "typescript": "^6.0.2"
  },
  "packageManager": "yarn@4.11.0",
  "prettier": {
    "quoteProps": "consistent",
    "singleQuote": true,
    "tabWidth": 2,
    "trailingComma": "es5",
    "useTabs": false
  },
  "commitlint": {
    "extends": [
      "@commitlint/config-conventional"
    ]
  }
}
```

Why each change:
- `name` renamed to `-monorepo` and `private: true` — the root is no longer publishable
- `workspaces: ["packages/*", "apps/*"]` — Yarn now finds the library and apps
- `scripts` rewritten to delegate to workspaces or Turbo
- `typescript` kept at root because tsconfig base lives at root
- `turbo`, `lefthook`, `commitlint`, `prettier`, eslint stack — workspace-wide tooling stays at root

- [ ] **Step 3.2: Rewrite root `tsconfig.json` as a shared base**

The current `tsconfig.json` has `paths` and `rootDir` that only make sense for the old flat structure. Rewrite it as a pure shared base:

```json
{
  "compilerOptions": {
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,
    "customConditions": ["react-native-strict-api"],
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "jsx": "react-jsx",
    "lib": ["ESNext"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noImplicitUseStrict": false,
    "noStrictGenericChecks": false,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "target": "ESNext",
    "verbatimModuleSyntax": true
  }
}
```

Removed `rootDir` and `paths` — workspaces define those themselves.

- [ ] **Step 3.3: Run `yarn install` to relink workspaces**

Run:
```bash
yarn install
```

Expected: succeeds. Yarn discovers two workspaces (`react-native-nitro-background-geolocation` and `react-native-nitro-background-geolocation-example`). Lockfile may update. No errors.

If you see "package X is not found in the project" — the workspace name doesn't match a published reference yet. Continue to Task 4 (example rewire) which fixes example→library resolution.

- [ ] **Step 3.4: Commit**

```bash
git add package.json tsconfig.json yarn.lock
git commit -m "chore(monorepo): rewrite root package.json as workspace orchestrator"
```

---

## Phase 2: Rewire the example app

### Task 4: Update example app to depend on the library via workspace resolution

**Files:**
- Modify: `apps/example/package.json`
- Modify: `apps/example/metro.config.js`
- Modify: `apps/example/babel.config.js`
- Modify: `apps/example/react-native.config.js`
- Modify: `apps/example/tsconfig.json`
- Modify: `apps/example/app.json`

- [ ] **Step 4.1: Add the library as an explicit workspace dependency**

Edit `apps/example/package.json`. Add the library to `dependencies` (alphabetically, before `react-native-nitro-modules`):

Replace:
```json
    "react-native": "0.83.6",
    "react-native-nitro-modules": "^0.35.6",
    "react-native-web": "~0.21.0"
```

With:
```json
    "react-native": "0.83.6",
    "react-native-nitro-background-geolocation": "*",
    "react-native-nitro-modules": "^0.35.6",
    "react-native-web": "~0.21.0"
```

Then remove `react-native-monorepo-config` from `devDependencies`:

Replace:
```json
  "devDependencies": {
    "expo-dev-client": "~55.0.32",
    "react-native-builder-bob": "^0.41.0",
    "react-native-monorepo-config": "^0.3.3"
  }
```

With:
```json
  "devDependencies": {
    "expo-dev-client": "~55.0.32",
    "react-native-builder-bob": "^0.41.0"
  }
```

- [ ] **Step 4.2: Rewrite `apps/example/metro.config.js` (hand-rolled monorepo Metro config)**

The current file uses `react-native-monorepo-config`. Replace it with this standard pattern (the same one Nitro Modules uses):

```js
const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Force resolving peer dependencies to the example app's versions
//    to avoid duplicate React / RN copies in the bundle.
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react-native-nitro-modules': path.resolve(
    projectRoot,
    'node_modules/react-native-nitro-modules'
  ),
};

module.exports = config;
```

- [ ] **Step 4.3: Rewrite `apps/example/react-native.config.js`**

The current file references `../package.json` (the old root package). Point it at the library workspace explicitly:

```js
const path = require('path');

module.exports = {
  dependencies: {
    'react-native-nitro-background-geolocation': {
      root: path.resolve(
        __dirname,
        '../../packages/react-native-nitro-background-geolocation'
      ),
      platforms: {
        // Codegen script incorrectly fails without this
        // So we explicitly specify the platforms with empty object
        ios: {},
        android: {},
      },
    },
  },
};
```

- [ ] **Step 4.4: Rewrite `apps/example/babel.config.js`**

The current file points `root` at `..` (which used to be the library). Update it to point at the library workspace, and read the library's own `package.json`:

```js
const path = require('path');
const { getConfig } = require('react-native-builder-bob/babel-config');

const libRoot = path.resolve(
  __dirname,
  '../../packages/react-native-nitro-background-geolocation'
);
const pkg = require(path.join(libRoot, 'package.json'));

module.exports = function (api) {
  api.cache(true);

  return getConfig(
    {
      presets: ['babel-preset-expo'],
    },
    { root: libRoot, pkg }
  );
};
```

- [ ] **Step 4.5: Update `apps/example/tsconfig.json` to extend the new base**

The current file extends `../tsconfig`. After the move, the base is two levels up:

```json
{
  "extends": "../../tsconfig",
  "compilerOptions": {
    // Avoid expo-cli auto-generating a tsconfig
  }
}
```

- [ ] **Step 4.6: Update `apps/example/app.json` plugin path**

The current `plugins` entry uses `"../app.plugin.js"`. Update it to point at the package:

Replace:
```json
    "plugins": [
      "../app.plugin.js"
    ]
```

With:
```json
    "plugins": [
      "../../packages/react-native-nitro-background-geolocation/app.plugin.js"
    ]
```

- [ ] **Step 4.7: Run `yarn install` to wire up the workspace dependency**

Run:
```bash
yarn install
```

Expected: succeeds. Inside `apps/example/node_modules/`, `react-native-nitro-background-geolocation` should now resolve as a symlink to the package workspace.

- [ ] **Step 4.8: Verify the symlink**

Run:
```bash
ls -la apps/example/node_modules/react-native-nitro-background-geolocation
```

Expected: it's a symlink pointing into `packages/react-native-nitro-background-geolocation`. (On some systems it appears under the root `node_modules` due to hoisting — that's also fine. Confirm with `node -e "console.log(require.resolve('react-native-nitro-background-geolocation/package.json', { paths: ['apps/example'] }))"`.)

- [ ] **Step 4.9: Commit**

```bash
git add apps/example/ yarn.lock
git commit -m "chore(monorepo): rewire example app to library workspace

Drop react-native-monorepo-config in favor of standard Metro
watchFolders + extraNodeModules pattern. Wire example to the
library via workspace '*' dependency. Update plugin path in
app.json and library root path in react-native.config.js."
```

---

### Task 5: Verify library builds and example resolves the library

- [ ] **Step 5.1: Build the library**

Run:
```bash
yarn lib prepare
```

Expected: bob runs nitrogen, then module build, then typescript build. `packages/react-native-nitro-background-geolocation/lib/` is populated.

If nitrogen fails because `nitro.json` paths are off, double-check `packages/react-native-nitro-background-geolocation/nitro.json` and that `src/NitroBackgroundGeolocation.nitro.ts` is in place. Don't continue until this passes.

- [ ] **Step 5.2: Typecheck both workspaces**

Run:
```bash
yarn typecheck
```

Expected: passes for both `react-native-nitro-background-geolocation` and the example. If the example fails because TS can't find the library types, ensure `lib/typescript/` exists from Step 5.1 (it does because `prepare` just ran).

- [ ] **Step 5.3: Lint both workspaces**

Run:
```bash
yarn lint
```

Expected: passes.

- [ ] **Step 5.4: Quick Metro resolution check (no native build yet)**

Run:
```bash
node -e "console.log(require.resolve('react-native-nitro-background-geolocation/package.json', { paths: ['apps/example'] }))"
```

Expected: prints a path pointing into `packages/react-native-nitro-background-geolocation`.

- [ ] **Step 5.5: Commit any incidental changes (e.g. regenerated nitrogen output, lib/ is gitignored so won't show)**

```bash
git status
git add -A
git diff --cached --stat
git commit -m "chore(monorepo): regenerate nitrogen output after restructure" || echo "nothing to commit"
```

---

## Phase 3: Update Turbo, ESLint, and Lefthook for new paths

### Task 6: Update `turbo.json` for the new workspace paths

**Files:**
- Modify: `turbo.json`

The current `turbo.json` has `inputs` that reference paths like `android`, `example/android`, `src/*.ts` — all of which are now wrong. Tasks also need to be declared correctly so that `turbo run build:android` finds them in the workspaces.

- [ ] **Step 6.1: Rewrite `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".nvmrc", ".yarnrc.yml", "tsconfig.json"],
  "globalEnv": ["NODE_ENV"],
  "tasks": {
    "prepare": {
      "inputs": [
        "package.json",
        "src/**",
        "nitrogen/**",
        "nitro.json",
        "tsconfig.json",
        "tsconfig.build.json"
      ],
      "outputs": ["lib/**", "nitrogen/generated/**"]
    },
    "typecheck": {
      "dependsOn": ["^prepare"],
      "inputs": [
        "src/**",
        "tsconfig.json",
        "package.json"
      ],
      "outputs": []
    },
    "lint": {
      "inputs": [
        "src/**",
        "*.{js,ts,tsx}",
        "package.json"
      ],
      "outputs": []
    },
    "clean": {
      "cache": false
    },
    "build:android": {
      "dependsOn": ["^prepare"],
      "env": ["ANDROID_HOME", "ORG_GRADLE_PROJECT_newArchEnabled"],
      "inputs": [
        "package.json",
        "android/**",
        "!android/.gradle/**",
        "!android/build/**",
        "!android/app/build/**"
      ],
      "outputs": []
    },
    "build:ios": {
      "dependsOn": ["^prepare"],
      "env": [
        "RCT_NEW_ARCH_ENABLED",
        "RCT_REMOVE_LEGACY_ARCH",
        "RCT_USE_RN_DEP",
        "RCT_USE_PREBUILT_RNCORE"
      ],
      "inputs": [
        "package.json",
        "ios/**",
        "!ios/build/**",
        "!ios/Pods/**"
      ],
      "outputs": []
    },
    "build:web": {
      "dependsOn": ["^prepare"],
      "inputs": ["package.json", "src/**", "app.json"],
      "outputs": ["dist/**"]
    }
  }
}
```

Key changes:
- `inputs` are now scoped to each workspace (no `example/` prefix — Turbo runs each task inside the workspace dir)
- `dependsOn: ["^prepare"]` ensures the library is built before the example builds
- Added `prepare`, `typecheck`, `lint`, `clean` tasks since the root scripts delegate via Turbo

- [ ] **Step 6.2: Add `build:android` / `build:ios` / `build:web` scripts to the example workspace**

Edit `apps/example/package.json` `scripts` — they exist but verify the names match `turbo.json`. The current example already has `build:ios`, `build:android`, `build:web`. Good.

The library package has `prepare`, `typecheck`, `lint`, `clean`. Good — these match.

- [ ] **Step 6.3: Dry-run Turbo to confirm task graph**

Run:
```bash
yarn turbo run prepare --dry=json | head -60
yarn turbo run typecheck --dry=json | head -60
```

Expected: tasks resolve cleanly, no warnings about missing inputs or unknown tasks.

- [ ] **Step 6.4: Run typecheck and lint through Turbo to verify everything still works**

Run:
```bash
yarn typecheck
yarn lint
```

Expected: passes (same as before, but now through Turbo).

- [ ] **Step 6.5: Commit**

```bash
git add turbo.json
git commit -m "chore(monorepo): update turbo pipeline for new workspace layout"
```

---

### Task 7: Update ESLint and Lefthook globs

**Files:**
- Modify: `eslint.config.mjs`
- Modify: `lefthook.yml`

- [ ] **Step 7.1: Inspect current `eslint.config.mjs` and update file globs**

Read the file. Any glob like `src/**/*.{ts,tsx}` should remain — ESLint runs from each workspace via Turbo. If there are root-relative ignore patterns like `example/`, change them to `apps/`, `packages/**/lib/`, `packages/**/nitrogen/generated/`.

If the file is workspace-agnostic (no path globs), leave it as-is.

- [ ] **Step 7.2: Inspect `lefthook.yml` and update globs**

Read the file. Common hooks reference `*.{js,ts,tsx}` or specific paths. Update any references to `example/...` → `apps/example/...` or `src/...` → `packages/**/src/...` if globs are root-anchored.

If lefthook globs are not anchored to old paths, no changes needed.

- [ ] **Step 7.3: Run lefthook install to refresh git hooks**

Run:
```bash
yarn lefthook install
```

Expected: hooks installed.

- [ ] **Step 7.4: Test the pre-commit hook by touching a TS file and staging it**

Run:
```bash
touch packages/react-native-nitro-background-geolocation/src/_touch.tmp.ts
echo "export {};" > packages/react-native-nitro-background-geolocation/src/_touch.tmp.ts
git add packages/react-native-nitro-background-geolocation/src/_touch.tmp.ts
yarn lefthook run pre-commit
```

Expected: hooks run, lint/typecheck pass on the touched file.

Cleanup:
```bash
git reset HEAD packages/react-native-nitro-background-geolocation/src/_touch.tmp.ts
rm packages/react-native-nitro-background-geolocation/src/_touch.tmp.ts
```

- [ ] **Step 7.5: Commit any ESLint/Lefthook config updates**

```bash
git add eslint.config.mjs lefthook.yml 2>/dev/null
git diff --cached --stat
git commit -m "chore(monorepo): update eslint and lefthook globs for new layout" || echo "no changes needed"
```

---

## Phase 4: Native build verification

### Task 8: Verify Android build works end-to-end

This is the riskiest verification — autolinking, Gradle paths, and CocoaPods all need to resolve the library at the new package location.

- [ ] **Step 8.1: Clean any stale build state**

Run:
```bash
yarn lib clean
yarn lib prepare
rm -rf apps/example/android/build apps/example/android/app/build apps/example/android/.gradle
```

- [ ] **Step 8.2: Expo prebuild the example for Android**

Run:
```bash
yarn example expo prebuild --platform android --clean
```

Expected: succeeds. The plugin path (`../../packages/.../app.plugin.js`) is found, strings.xml gets `plugin_bgloc_account_type` and `plugin_bgloc_content_authority` entries.

- [ ] **Step 8.3: Build the example for Android**

Run:
```bash
yarn example build:android
```

Expected: Gradle assembleDebug succeeds. The library is autolinked from `packages/react-native-nitro-background-geolocation/android/`.

If linking fails:
- Verify `apps/example/react-native.config.js` `root` path resolves: `node -e "console.log(require('./apps/example/react-native.config.js').dependencies['react-native-nitro-background-geolocation'].root)"` should print an absolute path to the package
- Verify the package's `android/build.gradle` is found

- [ ] **Step 8.4: Commit any prebuild output that should be tracked**

`apps/example/android/` is typically gitignored except for top-level config. Check:
```bash
git status apps/example/android | head -20
```

If files appear that should be ignored, the existing `.gitignore` likely already covers them. Otherwise commit only intentional changes.

```bash
git add apps/example/android 2>/dev/null
git diff --cached --stat
git commit -m "chore(monorepo): refresh android prebuild output" || echo "no changes"
```

---

### Task 9: Verify iOS build works end-to-end

- [ ] **Step 9.1: Clean iOS build state**

Run:
```bash
rm -rf apps/example/ios/Pods apps/example/ios/build apps/example/ios/Podfile.lock
```

- [ ] **Step 9.2: Expo prebuild for iOS**

Run:
```bash
yarn example expo prebuild --platform ios --clean
```

Expected: succeeds. `Info.plist` has `UIBackgroundModes` including `location` and the three NSLocation*UsageDescription keys (added by `app.plugin.js`).

- [ ] **Step 9.3: Install pods**

Run:
```bash
cd apps/example/ios && pod install && cd -
```

Expected: pods install. The NitroBackgroundGeolocation pod resolves to `packages/react-native-nitro-background-geolocation/NitroBackgroundGeolocation.podspec` via `use_native_modules!`.

If pod install fails with "podspec not found", verify the podspec was moved correctly:
```bash
ls packages/react-native-nitro-background-geolocation/NitroBackgroundGeolocation.podspec
```

- [ ] **Step 9.4: Build the example for iOS**

Run:
```bash
yarn example build:ios
```

Expected: xcodebuild succeeds.

- [ ] **Step 9.5: Commit iOS prebuild changes**

```bash
git add apps/example/ios 2>/dev/null
git diff --cached --stat
git commit -m "chore(monorepo): refresh ios prebuild output" || echo "no changes"
```

---

## Phase 5: Docusaurus docs site

### Task 10: Scaffold the docs site at `apps/docs`

**Files:**
- Create: `apps/docs/` (directory tree from create-docusaurus)

- [ ] **Step 10.1: Scaffold Docusaurus into `apps/docs`**

From repo root:
```bash
yarn dlx create-docusaurus@latest apps/docs classic --typescript
```

Expected: a fresh Docusaurus site appears at `apps/docs/`. Don't run its install yet — we'll integrate with the workspace first.

- [ ] **Step 10.2: Make the docs site a workspace package**

Edit `apps/docs/package.json`:
- Rename `"name"` to `"react-native-nitro-background-geolocation-docs"`
- Add `"private": true`
- Keep all other fields as scaffolded

- [ ] **Step 10.3: Run install at repo root to pick up the new workspace**

Run:
```bash
yarn install
```

Expected: docs workspace registered, dependencies hoisted into root `node_modules`.

- [ ] **Step 10.4: Run the dev server to confirm scaffold works**

Run:
```bash
yarn docs start
```

Expected: Docusaurus dev server starts on `localhost:3000`. Stop it (Ctrl+C) and continue.

- [ ] **Step 10.5: Commit the scaffold**

```bash
git add apps/docs yarn.lock package.json
git commit -m "feat(docs): scaffold docusaurus site at apps/docs"
```

---

### Task 11: Seed docs content from Cordova plugin + current repo

**Files:**
- Modify: `apps/docs/docusaurus.config.js` (or `.ts`)
- Create: `apps/docs/docs/intro.md`
- Create: `apps/docs/docs/getting-started.md`
- Create: `apps/docs/docs/configuration.md`
- Create: `apps/docs/docs/providers/distance-filter.md`
- Create: `apps/docs/docs/providers/raw.md`
- Create: `apps/docs/docs/providers/activity.md`
- Create: `apps/docs/docs/headless-tasks.md`
- Create: `apps/docs/docs/http-posting.md`
- Create: `apps/docs/docs/events.md`
- Create: `apps/docs/docs/platform-quirks.md`
- Create: `apps/docs/docs/architecture/decisions.md`
- Modify: `apps/docs/sidebars.js` (or `.ts`)

- [ ] **Step 11.1: Configure Docusaurus for the project**

Edit `apps/docs/docusaurus.config.js` (or `.ts` if TypeScript variant). Set these fields:

```js
const config = {
  title: 'React Native Nitro Background Geolocation',
  tagline: 'Background location tracking for React Native, powered by Nitro Modules',
  url: 'https://atoui-zahreddine.github.io',
  baseUrl: '/react-native-nitro-background-geolocation/',
  organizationName: 'atoui-zahreddine',
  projectName: 'react-native-nitro-background-geolocation',
  trailingSlash: false,
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl:
            'https://github.com/atoui-zahreddine/react-native-nitro-background-geolocation/edit/main/apps/docs/',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'Nitro Background Geolocation',
      items: [
        { type: 'docSidebar', sidebarId: 'mainSidebar', position: 'left', label: 'Docs' },
        {
          href: 'https://github.com/atoui-zahreddine/react-native-nitro-background-geolocation',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} Zahreddine Atoui. Built with Docusaurus.`,
    },
  },
};

module.exports = config;
```

(If the scaffold gave you `.ts`, adapt the structure but the field values are identical.)

- [ ] **Step 11.2: Seed `intro.md` from the README**

Create `apps/docs/docs/intro.md` with content that introduces the library. Use the existing repo `README.md` as source. Keep it under 500 words — the front page should orient, not overwhelm.

```md
---
sidebar_position: 1
---

# Introduction

`react-native-nitro-background-geolocation` is a high-performance background location tracker for React Native, built on [Nitro Modules](https://github.com/mrousavy/nitro). It tracks the device's location in the foreground and background, batches updates, and posts them to a configured server.

## What it does

- Background location tracking on iOS and Android
- Multiple [Location Providers](./providers/distance-filter): distance-filter, activity-based, raw
- Built-in [HTTP posting](./http-posting) with batching and a configurable [Post Template](./configuration#post-template)
- [Headless tasks](./headless-tasks) on Android for execution after app termination
- iOS [native continuation](./platform-quirks#ios-native-continuation) for relaunch on location events
- TypeScript-first API with typed event subscriptions

## What it is not

- It is **not** a 1:1 port of `cordova-background-geolocation-plugin`. Functional parity is the goal; API shape follows Nitro idioms (sync where fast, Promises for I/O, typed enums for constants).
- It does **not** support the legacy React Native bridge — new architecture only.
- It does **not** auto-include location permissions — declare them yourself in `AndroidManifest.xml` and `Info.plist`.

See [Getting Started](./getting-started) to install and use it.
```

- [ ] **Step 11.3: Seed `getting-started.md`**

Create `apps/docs/docs/getting-started.md`:

```md
---
sidebar_position: 2
---

# Getting Started

## Installation

```bash
yarn add react-native-nitro-background-geolocation react-native-nitro-modules
```

iOS (with CocoaPods):
```bash
cd ios && pod install
```

## Permissions

Declare the location permissions yourself:

**Android** (`AndroidManifest.xml`):
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```

**iOS** (`Info.plist`):
```xml
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>This app uses your location in the background to continue tracking.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app uses your location while tracking is active.</string>
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
</array>
```

If you use Expo, the bundled [config plugin](https://github.com/atoui-zahreddine/react-native-nitro-background-geolocation/blob/main/packages/react-native-nitro-background-geolocation/app.plugin.js) sets the iOS keys and the Android content-provider authority for you.

## Basic usage

```ts
import { BackgroundGeolocation, LocationProvider, LocationAccuracy } from 'react-native-nitro-background-geolocation';

BackgroundGeolocation.configure({
  locationProvider: LocationProvider.DISTANCE_FILTER_PROVIDER,
  desiredAccuracy: LocationAccuracy.HIGH,
  distanceFilter: 50,
  stationaryRadius: 50,
  notificationTitle: 'Tracking active',
});

const unsubscribe = BackgroundGeolocation.onLocation((location) => {
  console.log('New location', location);
});

BackgroundGeolocation.start();

// Later
unsubscribe();
BackgroundGeolocation.stop();
```

See [Configuration](./configuration) for the full list of options.
```

- [ ] **Step 11.4: Seed `configuration.md`**

Create `apps/docs/docs/configuration.md`. Use the **current repo's** API shape (from `packages/react-native-nitro-background-geolocation/src/NitroBackgroundGeolocation.nitro.ts`) as the source of truth, not the Cordova reference — the API is different.

Read the nitro spec:
```bash
cat packages/react-native-nitro-background-geolocation/src/NitroBackgroundGeolocation.nitro.ts
```

Document each config field. Use the [Cordova plugin's configuration docs](https://github.com/atoui-zahreddine/react-native-nitro-background-geolocation/blob/main/cordova-background-geolocation-plugin/docs/index.md) for option *descriptions and semantics*, but match the field names and types to the Nitro spec.

If there's any field name conflict, the Nitro spec wins — that's what the code actually exposes.

- [ ] **Step 11.5: Seed provider pages from Cordova docs**

For each of `apps/docs/docs/providers/distance-filter.md`, `apps/docs/docs/providers/raw.md`, `apps/docs/docs/providers/activity.md`:

Copy the relevant content from `cordova-background-geolocation-plugin/docs/distance_filter_provider.md` and `cordova-background-geolocation-plugin/docs/providers.md`. **Replace** code samples to match the current API (the TypeScript surface in `src/index.tsx`).

- [ ] **Step 11.6: Seed `headless-tasks.md` from `cordova-background-geolocation-plugin/docs/headless.md`**

Adapt to current behavior: explain that headless tasks are **Android only** in the first milestone, and that users register via `AppRegistry.registerHeadlessTask` (bare RN) or `TaskManager.defineTask` (Expo). Note that iOS uses [Native Continuation](./platform-quirks#ios-native-continuation) instead.

- [ ] **Step 11.7: Seed `http-posting.md` from the Cordova doc**

Source: `cordova-background-geolocation-plugin/docs/http_posting.md`. Update to use the current `BackgroundGeolocation.configure({ url, httpHeaders, postTemplate, syncThreshold })` API.

- [ ] **Step 11.8: Seed `events.md` from `cordova-background-geolocation-plugin/docs/events.md`**

Document each `onX(callback)` event subscription method from the Nitro spec, returning a `() => void` disposer.

- [ ] **Step 11.9: Seed `platform-quirks.md` from `cordova-background-geolocation-plugin/docs/quirks.md`**

Adapt content. Add an "iOS native continuation" section sourced from `docs/ios-killed-state-validation.md` and CONTEXT.md's design principle on iOS termination behavior.

- [ ] **Step 11.10: Seed `architecture/decisions.md`**

Create a page that links to the ADRs. Don't duplicate them — link out:

```md
# Architecture Decisions

This project records architectural decisions as ADRs in the [`docs/adr/`](https://github.com/atoui-zahreddine/react-native-nitro-background-geolocation/tree/main/docs/adr) directory of the repository.

Current ADRs:

- [ADR 0001: Functional parity, not API compatibility](https://github.com/atoui-zahreddine/react-native-nitro-background-geolocation/blob/main/docs/adr/0001-functional-parity-not-api-compatibility.md)
- [ADR 0002: Keep original native languages](https://github.com/atoui-zahreddine/react-native-nitro-background-geolocation/blob/main/docs/adr/0002-keep-original-native-languages.md)
- [ADR 0003: Monorepo with Yarn workspaces](https://github.com/atoui-zahreddine/react-native-nitro-background-geolocation/blob/main/docs/adr/0003-monorepo-with-yarn-workspaces.md)
```

- [ ] **Step 11.11: Rewrite `apps/docs/sidebars.js`**

```js
module.exports = {
  mainSidebar: [
    'intro',
    'getting-started',
    'configuration',
    {
      type: 'category',
      label: 'Location Providers',
      items: [
        'providers/distance-filter',
        'providers/raw',
        'providers/activity',
      ],
    },
    'events',
    'http-posting',
    'headless-tasks',
    'platform-quirks',
    {
      type: 'category',
      label: 'Architecture',
      items: ['architecture/decisions'],
    },
  ],
};
```

- [ ] **Step 11.12: Delete scaffold-generated demo content not used by the sidebar**

Remove the scaffold's tutorial docs and the blog:

```bash
rm -rf apps/docs/docs/tutorial-basics apps/docs/docs/tutorial-extras apps/docs/blog
rm -f apps/docs/docs/intro.md.bak
```

Also delete the scaffold's auto-generated images under `apps/docs/static/img/undraw_*.svg` if they're not used by the new pages.

- [ ] **Step 11.13: Build the docs site to confirm content compiles**

Run:
```bash
yarn docs build
```

Expected: build succeeds. Broken links surface as warnings — fix any that point to files we didn't create.

- [ ] **Step 11.14: Run the dev server and sanity-check rendering**

Run:
```bash
yarn docs start
```

Open `localhost:3000`, click through the sidebar, ensure each page renders. Stop the server.

- [ ] **Step 11.15: Commit**

```bash
git add apps/docs
git commit -m "feat(docs): seed docusaurus site with content from cordova reference and current api"
```

---

### Task 12: Add GitHub Pages deploy workflow

**Files:**
- Create: `.github/workflows/deploy-docs.yml`

- [ ] **Step 12.1: Create the workflow**

```yaml
name: Deploy Docs

on:
  push:
    branches: [main]
    paths:
      - 'apps/docs/**'
      - '.github/workflows/deploy-docs.yml'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8 # v5.0.0

      - name: Setup
        uses: ./.github/actions/setup

      - name: Build docs site
        run: yarn docs build

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: apps/docs/build

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 12.2: Note for the human: enable GitHub Pages**

The workflow assumes GitHub Pages is enabled with "GitHub Actions" as the source. After this PR merges, go to the repo Settings → Pages → Source → "GitHub Actions". (No code change needed; just a setting toggle.) Document this in the PR description.

- [ ] **Step 12.3: Commit**

```bash
git add .github/workflows/deploy-docs.yml
git commit -m "ci(docs): add github pages deploy workflow for docusaurus"
```

---

## Phase 6: Update CI for the new layout

### Task 13: Rewrite `.github/workflows/ci.yml` for monorepo paths

**Files:**
- Modify: `.github/workflows/ci.yml`

The current CI references `yarn nitrogen`, `yarn prepare`, `yarn example expo prebuild`, and `example/android/...` cache paths. All need to align with the new structure.

- [ ] **Step 13.1: Rewrite `ci.yml`**

```yaml
name: CI
on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
  merge_group:
    types:
      - checks_requested

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8 # v5.0.0

      - name: Setup
        uses: ./.github/actions/setup

      - name: Lint files
        run: yarn lint

      - name: Typecheck files
        run: yarn typecheck

  build-library:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8 # v5.0.0

      - name: Setup
        uses: ./.github/actions/setup

      - name: Build package
        run: yarn lib prepare

  build-android:
    runs-on: ubuntu-latest
    env:
      TURBO_CACHE_DIR: .turbo/android
    steps:
      - name: Checkout
        uses: actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8 # v5.0.0

      - name: Setup
        uses: ./.github/actions/setup

      - name: Generate nitrogen code
        run: yarn lib nitrogen

      - name: Cache turborepo for Android
        uses: actions/cache@5a3ec84eff668545956fd18022155c47e93e2684 # v4.2.3
        with:
          path: ${{ env.TURBO_CACHE_DIR }}
          key: ${{ runner.os }}-turborepo-android-${{ hashFiles('yarn.lock') }}
          restore-keys: |
            ${{ runner.os }}-turborepo-android-

      - name: Check turborepo cache for Android
        run: |
          TURBO_CACHE_STATUS=$(node -p "($(yarn turbo run build:android --cache-dir='${{ env.TURBO_CACHE_DIR }}' --dry=json)).tasks.find(t => t.task === 'react-native-nitro-background-geolocation-example#build:android').cache.status")

          if [[ $TURBO_CACHE_STATUS == "HIT" ]]; then
            echo "turbo_cache_hit=1" >> $GITHUB_ENV
          fi

      - name: Install JDK
        if: env.turbo_cache_hit != 1
        uses: actions/setup-java@c5195efecf7bdfc987ee8bae7a71cb8b11521c00 # v4.7.1
        with:
          distribution: 'zulu'
          java-version: '17'

      - name: Finalize Android SDK
        if: env.turbo_cache_hit != 1
        run: |
          /bin/bash -c "yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses > /dev/null"

      - name: Prebuild expo app for Android
        if: env.turbo_cache_hit != 1
        run: |
          yarn example expo prebuild --platform android

      - name: Cache Gradle
        if: env.turbo_cache_hit != 1
        uses: actions/cache@5a3ec84eff668545956fd18022155c47e93e2684 # v4.2.3
        with:
          path: |
            ~/.gradle/wrapper
            ~/.gradle/caches
          key: ${{ runner.os }}-gradle-${{ hashFiles('apps/example/android/gradle/wrapper/gradle-wrapper.properties') }}
          restore-keys: |
            ${{ runner.os }}-gradle-

      - name: Build example for Android
        env:
          JAVA_OPTS: "-XX:MaxHeapSize=6g"
        run: |
          yarn turbo run build:android --cache-dir="${{ env.TURBO_CACHE_DIR }}"

  build-ios:
    runs-on: macos-latest
    env:
      XCODE_VERSION: 26
      TURBO_CACHE_DIR: .turbo/ios
      RCT_USE_RN_DEP: 1
      RCT_USE_PREBUILT_RNCORE: 1
    steps:
      - name: Checkout
        uses: actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8 # v5.0.0

      - name: Setup
        uses: ./.github/actions/setup

      - name: Generate nitrogen code
        run: yarn lib nitrogen

      - name: Cache turborepo for iOS
        uses: actions/cache@5a3ec84eff668545956fd18022155c47e93e2684 # v4.2.3
        with:
          path: ${{ env.TURBO_CACHE_DIR }}
          key: ${{ runner.os }}-turborepo-ios-${{ hashFiles('yarn.lock') }}
          restore-keys: |
            ${{ runner.os }}-turborepo-ios-

      - name: Check turborepo cache for iOS
        run: |
          TURBO_CACHE_STATUS=$(node -p "($(yarn turbo run build:ios --cache-dir='${{ env.TURBO_CACHE_DIR }}' --dry=json)).tasks.find(t => t.task === 'react-native-nitro-background-geolocation-example#build:ios').cache.status")

          if [[ $TURBO_CACHE_STATUS == "HIT" ]]; then
            echo "turbo_cache_hit=1" >> $GITHUB_ENV
          fi

      - name: Use appropriate Xcode version
        if: env.turbo_cache_hit != 1
        uses: maxim-lobanov/setup-xcode@60606e260d2fc5762a71e64e74b2174e8ea3c8bd # v1.6.0
        with:
          xcode-version: ${{ env.XCODE_VERSION }}

      - name: Prebuild expo app for iOS
        if: env.turbo_cache_hit != 1
        run: |
          yarn example expo prebuild --platform ios

      - name: Build example for iOS
        run: |
          yarn turbo run build:ios --cache-dir="${{ env.TURBO_CACHE_DIR }}"

  build-web:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8 # v5.0.0

      - name: Setup
        uses: ./.github/actions/setup

      - name: Build example for Web
        run: |
          yarn example build:web
```

Key changes:
- `yarn nitrogen` → `yarn lib nitrogen`
- `yarn prepare` → `yarn lib prepare`
- Gradle cache `hashFiles` path: `example/...` → `apps/example/...`
- Turbo `find` paths now include the workspace name: `react-native-nitro-background-geolocation-example#build:android`

- [ ] **Step 13.2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: update workflows for monorepo workspace paths"
```

---

## Phase 7: Final verification

### Task 14: End-to-end green build

- [ ] **Step 14.1: Wipe transient state and reinstall from scratch**

Run:
```bash
yarn lib clean
rm -rf node_modules apps/*/node_modules packages/*/node_modules
yarn install
```

Expected: clean install completes without warnings about workspaces or unmet peer deps.

- [ ] **Step 14.2: Run the full pipeline**

Run:
```bash
yarn prepare
yarn typecheck
yarn lint
yarn docs build
```

Expected: every step passes.

- [ ] **Step 14.3: Skim `git log --oneline` to confirm history is clean**

Run:
```bash
git log --oneline main..HEAD
```

Expected: a clean series of `chore(monorepo)`, `feat(docs)`, `ci`, etc. commits. No squashing needed — each commit is meaningful.

- [ ] **Step 14.4: Push and open PR**

```bash
git push -u origin chore/monorepo-restructure
gh pr create --title "chore: restructure into a yarn-workspaces monorepo" --body "$(cat <<'EOF'
## Summary

- Restructured into Yarn 4 + Turborepo monorepo: library at \`packages/react-native-nitro-background-geolocation/\`, example app at \`apps/example/\`, new Docusaurus site at \`apps/docs/\`.
- Dropped \`react-native-monorepo-config\` in favor of standard Metro \`watchFolders\` + \`extraNodeModules\`, matching the upstream Nitro Modules pattern.
- Moved \`nitrogen/\`, \`nitro.json\`, podspec, Expo plugin, and bob config into the package. Root \`package.json\` becomes a private workspace orchestrator.
- Added Docusaurus docs site seeded from the Cordova reference plus the current Nitro API surface.
- Updated CI for the new paths. Added GitHub Pages deploy workflow for docs.

## Test plan

- [ ] \`yarn install\` clean from a fresh clone
- [ ] \`yarn prepare\` builds the library
- [ ] \`yarn typecheck\` passes
- [ ] \`yarn lint\` passes
- [ ] \`yarn docs build\` produces a static site
- [ ] CI green on Android, iOS, web jobs
- [ ] Manually enable GitHub Pages → "GitHub Actions" source after merging

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 14.5: After merging, enable GitHub Pages**

(Manual step.) Repo Settings → Pages → Source → "GitHub Actions". Then the `deploy-docs.yml` workflow will publish on the next push to `main` that touches `apps/docs/**`.

---

## Self-review notes

**Spec coverage check (from the grilling session):**

| Decision | Implemented in task |
|---|---|
| `packages/` for library | Task 1 |
| `apps/` for example + docs | Task 1, Task 10 |
| Single library package | Task 2 |
| Yarn 4 (no switch) | Confirmed — Task 3 keeps `packageManager: "yarn@4.11.0"` |
| `nitrogen/` + `nitro.json` move into package | Task 1 |
| Library config files move into package | Task 1 (podspec, plugin, babel, tsconfig.build) |
| Root config stays at root | Task 3, 7 (eslint, lefthook, turbo) |
| Root `tsconfig.json` as shared base | Task 3 |
| Root `package.json` is `-monorepo`, private, orchestrator | Task 3 |
| `docs/adr/` stays at root | Untouched by plan |
| Example wiring follows Nitro pattern (no monorepo-config pkg) | Task 4 |
| Single root `turbo.json`, no per-workspace overrides | Task 6 |
| Docusaurus seeded from Cordova + current repo | Task 10, 11 |
| GitHub Pages deploy with default URL | Task 12 |
| CI updated in the same PR | Task 13 |

**Placeholders:** None — every file content and command is concrete.

**Type consistency:** Workspace names used consistently:
- Library workspace: `react-native-nitro-background-geolocation` (from package.json `name`)
- Example workspace: `react-native-nitro-background-geolocation-example`
- Docs workspace: `react-native-nitro-background-geolocation-docs`
- Yarn shortcuts: `yarn lib`, `yarn example`, `yarn docs` — declared in root scripts (Task 3) and used in CI (Task 13) and verification (Task 5, 14)
