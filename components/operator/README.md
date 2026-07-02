# Operator Components

Unified staff cockpit primitives for admin, doctor, and support workflows.

Use these components when a staff screen combines operations, clinical review, recovery queues, patient context, or fast navigation. The goal is one compact product surface, not separate admin and doctor modes.

## Canonical URL

`/dashboard` is the canonical staff dashboard URL. It is the live queue cockpit for admins and doctors; support staff land on the bounded ops surface and can use the Ledger for request/payment metadata lookup. New code should use `STAFF_*_HREF` constants from `@/lib/dashboard/routes` rather than the legacy `ADMIN_*_HREF` / `DOCTOR_*_HREF` aliases.

## Use

| Component | Use for |
|-----------|---------|
| `OperatorShell` | Staff shell with sidebar and mobile operator nav. Role-aware (admin · doctor · support) via `navSections` and `brandLabel` props. Pass `hideMobileHamburger` when the page renders its own mobile nav (the doctor portal uses bottom tabs instead). |
| `OperatorPage` | Bounded desktop staff page frame |
| `OperatorPageHeader` | Standard staff page title/actions header |
| `OperatorScrollArea` | Internal scroll region inside bounded pages |
| `OperatorPanel` | Solid-depth staff panel |
| `OperatorSplitPane` | Recovery queue list plus detail panel |
| `StaffCommandPalette` | Local quick-action lists on case-heavy staff pages |

## Rules

- One cockpit for all staff roles. Do not reintroduce separate "switch to doctor mode" flows.
- Put the next decision or recovery action first.
- Keep patient identity, request summary, blockers, and action controls together.
- Prefer internal scroll panes over whole-page dashboard scrolling on desktop.
- Do not add decorative motion. Portal surfaces use state-only color transitions.
- Gate clinical actions on `hasDoctorAccess(profile)`; gate admin actions on `hasAdminAccess(profile)`; gate ops-only actions on `hasStaffAccess(profile)`. Helpers in `lib/auth/staff-capabilities.ts`.
- Use `revalidateStaff()` from `lib/dashboard/revalidate-staff.ts` after staff-visible mutations. Do not hand-roll `revalidatePath("/admin")` or `revalidatePath("/doctor")` strings.
