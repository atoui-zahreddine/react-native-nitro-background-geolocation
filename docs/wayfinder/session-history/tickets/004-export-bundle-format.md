---
id: 004
title: Export bundle format
labels: [wayfinder:grilling]
status: open
assignee:
blocked-by: [001]
---

## Question

What does an exported session bundle look like, and how is it shared?

- JSON schema for the bundle (likely the stored record itself, versioned, plus
  app/library version metadata so a shared bundle is self-describing for
  debugging).
- Share mechanism from the detail view (native share sheet with a file, e.g.
  via `expo-sharing`), and filename convention.
- Whether the bundle should be directly re-importable/viewable, or is a
  one-way debugging artifact for now.

## Resolution
