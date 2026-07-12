# Issue tracker

This repo uses a **local markdown tracker** stored in-repo. There is no external
issue service; issues are markdown files committed alongside the code.

## Layout

```
docs/wayfinder/<effort-slug>/
  map.md                     # the wayfinder map (label: wayfinder:map)
  tickets/NNN-<slug>.md      # child tickets, zero-padded sequential ids
```

## Ticket file format

```markdown
---
id: NNN
title: <ticket name — refer to tickets by this, never by bare id>
labels: [wayfinder:<research|prototype|grilling|task>]
status: open | closed
assignee: <name or empty — a non-empty assignee IS the claim>
blocked-by: [NNN, NNN]   # ids of tickets that must close first
---

## Question

<the decision or investigation this ticket resolves>

## Resolution

<empty while open; the answer is appended here when the ticket closes>
```

## Wayfinding operations

- **Create map**: write `map.md` with `labels: [wayfinder:map]` in frontmatter.
- **Create ticket**: add the next-numbered file under `tickets/`; wire
  `blocked-by` in a second pass once ids exist.
- **Claim**: set `assignee:` in frontmatter before doing any work. Open +
  unassigned = unclaimed.
- **Blocking**: the `blocked-by` frontmatter list (body convention — no native
  tracker relationships exist). A ticket is unblocked when every id in its
  `blocked-by` list has `status: closed`.
- **Frontier query**: `grep -l 'status: open'` over `tickets/`, filter to empty
  `assignee`, then filter to tickets whose `blocked-by` ids are all closed.
- **Resolve**: write the answer under `## Resolution`, flip `status: closed`,
  clear `assignee`, and append the one-line gist to the map's
  *Decisions so far* with a relative link to the ticket file.
- **Links**: use relative markdown links between map and tickets so they render
  on GitHub and in editors.

Commit tracker changes together with (or independently of) code changes as
normal commits.
