---
name: new-component
description: Scaffold a new React component with its co-located CSS file following the project's BEM + CSS var conventions
---

Create a new component in `src/components/` with two files:
1. `<ComponentName>.tsx` — functional component with typed props
2. `<ComponentName>.css` — co-located stylesheet using BEM class names and only CSS custom properties from `src/styles/variables.css`

No inline styles. No hardcoded color values. Use `--surface-*`, `--fg-*`, `--border-*`, `--color-*` tokens only.

Arguments: $ARGUMENTS (the component name, e.g. "MatchBadge")
