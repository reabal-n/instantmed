## Summary

<!-- What does this PR do? Why? -->

## Changes

<!-- Bullet list of key changes -->

## Design system checklist

- [ ] Verified in **light mode**
- [ ] Verified in **dark mode**
- [ ] Checked **reduced motion** (prefers-reduced-motion: reduce)
- [ ] No new arbitrary shadow values (`shadow-[0_...`) — use `shadow-primary/[...]` tokens
- [ ] No new `initial={false}` on motion elements
- [ ] No new spring physics (`stiffness`/`type: "spring"`) outside approved files
- [ ] No violet/purple hex values (except `--service-referral`)
- [ ] Animation duration ≤ 0.3s for entrance transitions

## Test plan

<!-- How was this tested? -->
