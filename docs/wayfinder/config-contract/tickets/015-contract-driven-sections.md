---
id: 015
title: Contract-driven settings sections
labels: [wayfinder:grilling]
status: closed
assignee:
blocked-by: [014]
---

## Question

Does the Config Contract carry presentation metadata — group display titles,
group order, field order within a group — so the example app's settings screen
and session detail screen derive their sections instead of hand-copying them?

Graduated from the map's fog by
[Nested config shape and platform ownership in types](005-nested-shape.md), which
settled the group set but deliberately left presentation open. Re-pointed at
[How reads report fields the platform does not own](014-foreign-platform-reads.md)
rather than the prototype, because that ticket created `CONFIG_FIELDS` — the
generated runtime export presentation metadata would ride in, if it rides
anywhere. Nothing here needs the prototype built first.

- **The duplication is real and admitted.** The seven sections are written out by
  hand in `apps/example/src/app/settings.tsx` and again in the session detail
  screen, which carries a comment acknowledging the copy. The shape decision
  re-cuts both screens onto the contract's seven groups, so this is the moment
  the copies either die or get re-copied.
- **Presentation may not belong in the contract.** The contract's stated job is
  configuration facts — name, group, platform owner, type, default, range,
  prose. A human-facing section title like "Foreground notification" is a
  different kind of fact from `default: 50`, and the docs table already derives
  from the prose without needing display titles.
- If titles do go in, decide whether the **group key** carries them
  (`notification` renders as "Notification") or an explicit `title` field does,
  and whether an example app is even the right consumer to design for — it is a
  demo, not a product surface.
- Field order matters for both screens and the docs table. Declaration order in
  the contract file is the obvious answer; confirm it is enough, or that an
  explicit ordinal is needed.
- The subtitles shipped by
  [the provider-behavior map](../../provider-behavior/map.md) are per-field
  explanatory copy already living in the settings screen. Decide whether they are
  contract prose or app copy, because the contract already carries a description
  per field for the docs table.

## Resolution

**The contract carries structure, not presentation.** `CONFIG_FIELDS` gains no
`label` and no group `title`; the example app keeps its own labels and formatters
in one module shared by both screens.

### What comes from the contract

- **Group order and field order** — declaration order in the authored contract
  file. No explicit ordinal. It is already the docs table's order, and one
  authored file makes declaration order the natural sequence for every consumer.
- **Everything factual**, via `CONFIG_FIELDS` from
  [How reads report fields the platform does not own](014-foreign-platform-reads.md):
  platforms, default, min / max / step / units, description.

### What stays in the app

Labels like "Update interval" and formatters like `format: bool` are not
configuration facts. The duplication this ticket targets is between two *example
app* screens — `apps/example/src/app/settings.tsx` and
`apps/example/src/app/session/[id].tsx`, which duplicate section title, label and
platform tag per field — so the fix belongs in the app: one shared module both
screens import. The platform-tag copy dies separately, absorbed by
`CONFIG_FIELDS`.

Rejected: putting `label` and group `title` in the contract. It would make the
library publish UI copy on behalf of a demo app, and turn every label reword into
a library release. The library stays factual.

### Two prose fields, bounded

The contract's `description` is reference prose — what the field is, how the
platforms differ, what depends on it — feeding the docs table and IDE hover. It
is already long: `distanceFilter`'s carries a speed-versus-spacing table, which
has no business inside a mobile settings row. The app's per-field subtitle,
shipped by [the provider-behavior map](../../provider-behavior/map.md), stays app
copy: shorter, task-oriented.

The boundary that keeps this from becoming drift, written into the contract's own
rules:

> App copy never states a default, a range, or a platform. Those interpolate from
> `CONFIG_FIELDS`.

Today **5 subtitles state a default in prose** — "Default 50 m." at
`apps/example/src/app/settings.tsx:567` and four more — a seventh copy of the
defaults hiding in user-facing text, and one that would have drifted exactly as
the docs table did. After this rule the only drift-capable content left between
the two prose fields is tone, never numbers.
