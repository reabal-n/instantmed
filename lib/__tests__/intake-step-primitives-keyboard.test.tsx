/**
 * Keyboard-navigation behaviour for the intake roving-radio primitive.
 *
 * The shared unit-test environment is `node` (see vitest.config.ts) and the
 * repo does not ship jsdom / @testing-library / react-test-renderer, so we
 * exercise `useRovingRadio` — the single source of truth for arrow-key, Home,
 * End, wraparound, the resting tab stop, and (the fix this file pins) skipping
 * DISABLED options — by mounting it inside a probe component via
 * `renderToStaticMarkup` and capturing the returned handlers. The logic under
 * test is pure, so calling `onKeyDown` with a synthetic event and asserting on
 * `onSelect` / `preventDefault` is deterministic and DOM-free.
 *
 * Under `renderToStaticMarkup` callback refs never fire, so the hook's
 * `itemsRef.current[i]?.focus()` safely no-ops — exactly the seam we want, as
 * the behaviour we care about is which index `onSelect` is asked to select.
 */

import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { useRovingRadio } from "@/components/request/shared/intake-step-primitives"

type RovingApi = ReturnType<typeof useRovingRadio>

/**
 * Render the hook once and return its handler bundle. `selectedIndex`,
 * disabled predicate, and the `onSelect` spy mirror how the real choice groups
 * wire the hook.
 */
function mountRovingRadio(opts: {
  count: number
  selectedIndex: number
  onSelect: (index: number) => void
  isDisabled?: (index: number) => boolean
}): RovingApi {
  let captured: RovingApi | undefined

  function Probe() {
    captured = useRovingRadio(opts.count, opts.selectedIndex, opts.onSelect, opts.isDisabled)
    return null
  }

  renderToStaticMarkup(<Probe />)

  if (!captured) throw new Error("useRovingRadio did not return a handler bundle")
  return captured
}

/** Synthetic keyboard event sufficient for `useRovingRadio.onKeyDown`. */
function keyEvent(key: string) {
  const preventDefault = vi.fn()
  return {
    event: { key, preventDefault } as unknown as React.KeyboardEvent<HTMLButtonElement>,
    preventDefault,
  }
}

describe("useRovingRadio keyboard navigation", () => {
  it("moves selection forward and backward with arrow keys", () => {
    const onSelect = vi.fn()
    const { onKeyDown } = mountRovingRadio({ count: 4, selectedIndex: 1, onSelect })

    const right = keyEvent("ArrowRight")
    onKeyDown(right.event, 1)
    expect(onSelect).toHaveBeenLastCalledWith(2)
    expect(right.preventDefault).toHaveBeenCalledTimes(1)

    const left = keyEvent("ArrowLeft")
    onKeyDown(left.event, 1)
    expect(onSelect).toHaveBeenLastCalledWith(0)

    const down = keyEvent("ArrowDown")
    onKeyDown(down.event, 1)
    expect(onSelect).toHaveBeenLastCalledWith(2)

    const up = keyEvent("ArrowUp")
    onKeyDown(up.event, 1)
    expect(onSelect).toHaveBeenLastCalledWith(0)
  })

  it("wraps around the ends with arrow keys", () => {
    const onSelect = vi.fn()
    const { onKeyDown } = mountRovingRadio({ count: 3, selectedIndex: 2, onSelect })

    onKeyDown(keyEvent("ArrowRight").event, 2)
    expect(onSelect).toHaveBeenLastCalledWith(0)

    onKeyDown(keyEvent("ArrowLeft").event, 0)
    expect(onSelect).toHaveBeenLastCalledWith(2)
  })

  it("jumps to the ends with Home and End", () => {
    const onSelect = vi.fn()
    const { onKeyDown } = mountRovingRadio({ count: 5, selectedIndex: 2, onSelect })

    onKeyDown(keyEvent("Home").event, 2)
    expect(onSelect).toHaveBeenLastCalledWith(0)

    onKeyDown(keyEvent("End").event, 2)
    expect(onSelect).toHaveBeenLastCalledWith(4)
  })

  it("ignores non-navigation keys without selecting or preventing default", () => {
    const onSelect = vi.fn()
    const { onKeyDown } = mountRovingRadio({ count: 3, selectedIndex: 0, onSelect })

    const tab = keyEvent("Tab")
    onKeyDown(tab.event, 0)
    expect(onSelect).not.toHaveBeenCalled()
    expect(tab.preventDefault).not.toHaveBeenCalled()
  })

  it("exposes exactly one tab stop at rest", () => {
    const { tabIndexFor } = mountRovingRadio({ count: 4, selectedIndex: 2, onSelect: vi.fn() })

    const stops = [0, 1, 2, 3].map((i) => tabIndexFor(i))
    expect(stops.filter((t) => t === 0)).toHaveLength(1)
    // The selected option owns the tab stop.
    expect(tabIndexFor(2)).toBe(0)
  })

  it("puts the resting tab stop on the first option when nothing is selected", () => {
    const { tabIndexFor } = mountRovingRadio({ count: 3, selectedIndex: -1, onSelect: vi.fn() })

    expect(tabIndexFor(0)).toBe(0)
    expect(tabIndexFor(1)).toBe(-1)
    expect(tabIndexFor(2)).toBe(-1)
  })

  // ---------------------------------------------------------------------------
  // Disabled-aware navigation (pins the P2/P3 keyboard-trap fix)
  // ---------------------------------------------------------------------------

  it("skips a disabled option when arrowing forward and never selects it", () => {
    const onSelect = vi.fn()
    // index 1 is disabled; ArrowRight from 0 must land on 2, not 1.
    const { onKeyDown } = mountRovingRadio({
      count: 4,
      selectedIndex: 0,
      onSelect,
      isDisabled: (i) => i === 1,
    })

    onKeyDown(keyEvent("ArrowRight").event, 0)
    expect(onSelect).toHaveBeenLastCalledWith(2)
    expect(onSelect).not.toHaveBeenCalledWith(1)
  })

  it("skips a disabled option when arrowing backward", () => {
    const onSelect = vi.fn()
    // index 1 disabled; ArrowLeft from 2 must wrap past 1 to 0.
    const { onKeyDown } = mountRovingRadio({
      count: 3,
      selectedIndex: 2,
      onSelect,
      isDisabled: (i) => i === 1,
    })

    onKeyDown(keyEvent("ArrowLeft").event, 2)
    expect(onSelect).toHaveBeenLastCalledWith(0)
  })

  it("never lands Home/End on a disabled boundary option", () => {
    const onSelect = vi.fn()
    // First (0) and last (3) options disabled.
    const { onKeyDown } = mountRovingRadio({
      count: 4,
      selectedIndex: 1,
      onSelect,
      isDisabled: (i) => i === 0 || i === 3,
    })

    onKeyDown(keyEvent("Home").event, 1)
    expect(onSelect).toHaveBeenLastCalledWith(1)

    onKeyDown(keyEvent("End").event, 1)
    expect(onSelect).toHaveBeenLastCalledWith(2)
  })

  it("gives the resting tab stop to the first ENABLED option, not a disabled first option", () => {
    // Nothing selected AND option 0 disabled — the group must stay reachable
    // via option 1, never via the disabled option 0.
    const { tabIndexFor } = mountRovingRadio({
      count: 3,
      selectedIndex: -1,
      onSelect: vi.fn(),
      isDisabled: (i) => i === 0,
    })

    expect(tabIndexFor(0)).toBe(-1)
    expect(tabIndexFor(1)).toBe(0)
    expect(tabIndexFor(2)).toBe(-1)
  })

  it("falls back gracefully to the first option when every option is disabled", () => {
    const onSelect = vi.fn()
    const api = mountRovingRadio({
      count: 3,
      selectedIndex: -1,
      onSelect,
      isDisabled: () => true,
    })

    // No enabled option can hold the tab stop, so none reports tabIndex 0.
    expect([0, 1, 2].map((i) => api.tabIndexFor(i))).toEqual([-1, -1, -1])

    // Arrow navigation must not select a disabled option.
    api.onKeyDown(keyEvent("ArrowRight").event, 0)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("does not select a disabled selectedIndex's neighbours incorrectly when only that index is disabled", () => {
    const onSelect = vi.fn()
    // Mirrors ChoiceCardGroup: a disabled option exists but is not the cursor.
    const { onKeyDown, tabIndexFor } = mountRovingRadio({
      count: 3,
      selectedIndex: 0,
      onSelect,
      isDisabled: (i) => i === 2,
    })

    // Resting stop stays on the enabled selected option.
    expect(tabIndexFor(0)).toBe(0)
    expect(tabIndexFor(2)).toBe(-1)

    // ArrowRight from 1 wraps past disabled 2 back to 0.
    onKeyDown(keyEvent("ArrowRight").event, 1)
    expect(onSelect).toHaveBeenLastCalledWith(0)
  })
})
