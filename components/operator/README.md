# Operator Components

Unified staff cockpit primitives for admin and admin-doctor workflows.

Use these components when a staff screen combines operations, clinical review, recovery queues, patient context, or fast navigation. The goal is one compact product surface, not separate admin and doctor modes.

## Use

| Component | Use for |
|-----------|---------|
| `OperatorShell` | Admin staff shell with sidebar and mobile operator nav |
| `OperatorPage` | Bounded desktop staff page frame |
| `OperatorPageHeader` | Standard staff page title/actions header |
| `OperatorScrollArea` | Internal scroll region inside bounded pages |
| `OperatorPanel` | Solid-depth staff panel |
| `OperatorSplitPane` | Recovery queue list plus detail panel |
| `StaffCommandPalette` | Keyboard staff search and jump actions |

## Rules

- Keep admin-doctor work in one cockpit. Do not reintroduce separate "switch to doctor mode" flows.
- Put the next decision or recovery action first.
- Keep patient identity, request summary, blockers, and action controls together.
- Prefer internal scroll panes over whole-page dashboard scrolling on desktop.
- Do not add decorative motion. Portal surfaces use state-only color transitions.
