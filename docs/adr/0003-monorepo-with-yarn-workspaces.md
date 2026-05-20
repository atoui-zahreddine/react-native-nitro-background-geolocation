# Monorepo with Yarn Workspaces and Turborepo

The repository is restructured from a flat single-package layout into a monorepo with `packages/` (the library) and `apps/` (example app, Docusaurus docs site), orchestrated by Yarn 4 workspaces and Turborepo.

## Considered Options

- **Stay flat** — simpler, but no clean separation between the library and its consumers (example, docs). The root `package.json` conflates orchestration config with publishable package config.
- **pnpm workspaces** — better disk efficiency, but symlinked `node_modules` causes friction with Metro, CocoaPods, and React Native tooling. The RN/Nitro ecosystem is tested against Yarn.
- **Bun** — fastest installs, but least mature for React Native native builds. Too risky for a library that needs reliable `pod install` and Gradle builds.

## Consequences

- The example app drops `react-native-monorepo-config` and follows the Nitro Modules pattern: workspace `"*"` dependency, manual Metro `watchFolders` + `extraNodeModules`, standard `use_native_modules!` in the Podfile.
- CI workflows, Turbo pipeline inputs, and cache paths must be updated to reflect the new directory structure.
- Nitrogen codegen (`nitro.json`, `nitrogen/`) moves into the package, not the repo root.
