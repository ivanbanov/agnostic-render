/**
 * DropdownMenu connect — a pure mapping from the machine snapshot (+ props) to
 * the logical surface the view spreads.
 *
 * Output is substrate-agnostic: handlers (`onPress`, `onKeyDown`, …) + attrs
 * (`id`, `role`, `expanded`, …) in one flat bag per part. Core emits no
 * `data-*` — each target derives whatever it wants from the machine state +
 * these fields. Plus content-only positioning fields (`side`, `placement`,
 * offsets) the view consumes to anchor.
 *
 * This is pure — it runs on every snapshot read and must not fire side effects.
 * Consumer callbacks (onOpenChange) are fired by the connector via the reaction
 * declared at the bottom; the machine never reads props or fires them.
 *
 * The `withItems`/`getItem` pattern threads the ordered item list per render
 * (items live in the view, not machine context) so keyboard nav / typeahead can
 * compute "next item" without the machine storing the list.
 *
 * Sibling files: machine.ts · types.ts · props.ts · utils.ts
 */

import type { Connect, ConnectSnapshot } from '@render-experiment/machine-core'
import { makeReaction } from '@render-experiment/machine-core'
import { placementToSide } from '@render-experiment/utils'
import type {
  DropdownMenuApi,
  DropdownMenuComputed,
  DropdownMenuContext,
  DropdownMenuEvent,
  DropdownMenuItemPart,
  DropdownMenuItemProps,
  DropdownMenuMachineProps,
  DropdownMenuState,
} from './types'
import { makeSelectEvent, PRINTABLE_KEY_RE } from './utils'

type Snapshot = ConnectSnapshot<
  DropdownMenuState,
  DropdownMenuContext,
  DropdownMenuEvent,
  DropdownMenuMachineProps,
  DropdownMenuComputed
>

/** Build the api for a given snapshot + the items the view is about to render. */
function buildApi(snapshot: Snapshot, items: DropdownMenuItemProps[]): DropdownMenuApi {
  const { context, props, send, computed } = snapshot
  const { open, triggerId, contentId } = computed
  const side = placementToSide(context.placement)

  const trigger = {
    onPress: () => send({ type: 'trigger.click', items }),
    onKeyDown: event => {
      if (!event) return
      switch (event.key) {
        case 'ArrowDown':
        case 'Enter':
        case ' ':
          // preventDefault stops the browser from submitting an enclosing form
          // on Enter, synthesizing a keyup click on Space (which would
          // re-toggle), or scrolling the page on ArrowDown.
          event.preventDefault?.()
          if (!open) send({ type: 'trigger.key.open', items })
          break
        case 'ArrowUp':
          event.preventDefault?.()
          if (!open) send({ type: 'trigger.key.open.last', items })
          break
      }
    },
    id: triggerId,
    expanded: open,
    role: 'button',
    hasPopup: 'menu',
    controls: open ? contentId : undefined,
  } satisfies DropdownMenuApi['parts']['trigger']

  const content = {
    onKeyDown: event => {
      if (!event) return
      const k = event.key
      switch (k) {
        case 'ArrowDown':
          event.preventDefault?.()
          send({ type: 'arrow.down', items })
          break
        case 'ArrowUp':
          event.preventDefault?.()
          send({ type: 'arrow.up', items })
          break
        case 'Home':
          event.preventDefault?.()
          send({ type: 'home', items })
          break
        case 'End':
          event.preventDefault?.()
          send({ type: 'end', items })
          break
        case 'Enter':
          event.preventDefault?.()
          send({ type: 'enter', items })
          break
        case ' ':
          event.preventDefault?.()
          send({ type: 'space', items })
          break
        case 'Escape':
          // Handled by the target's escape effect; render layer lets it bubble.
          break
        case 'Tab':
          if (props.focusTrap) {
            // Trapped: swallow Tab so focus can't leave the open menu. The menu
            // stays open; Esc or selecting an item exits.
            event.preventDefault?.()
            break
          }
          // Loose (default): don't preventDefault — the browser's Tab moves
          // focus to the next focusable, which is what we want after closing.
          send({ type: 'close' })
          break
        default:
          if (
            context.typeahead &&
            typeof k === 'string' &&
            k.length === 1 &&
            PRINTABLE_KEY_RE.test(k)
          ) {
            send({ type: 'typeahead.char', char: k, items })
          }
      }
    },
    // Re-enable pointer-driven highlight on movement, undoing suspendPointer.
    onPointerMove: () => {
      if (context.suspendPointer) send({ type: 'pointer.resume' })
    },
    id: contentId,
    role: 'menu',
    focusable: true,
    labelledBy: triggerId,
    // Positioning — consumed by the view (not spread as attrs).
    side,
    placement: context.placement,
    offsetX: props.offsetX,
    offsetY: props.offsetY,
  } satisfies DropdownMenuApi['parts']['content']

  const getItem = (item: DropdownMenuItemProps): DropdownMenuItemPart => {
    const highlighted = context.highlightedValue === item.value
    const isToggleKind = item.kind === 'checkbox' || item.kind === 'radio'

    return {
      highlighted,
      disabled: !!item.disabled,
      onPress: () => {
        if (item.disabled) return
        // Invoke onSelect synchronously here so the guard shouldCloseOnSelect
        // can read defaultPrevented before deciding whether to close. The
        // machine receives the same selectEvent instance.
        const selectEvent = makeSelectEvent()
        item.onSelect?.(selectEvent)
        send({
          type: 'item.click',
          value: item.value,
          onSelect: item.onSelect,
          selectEvent,
          closeOnSelect: item.closeOnSelect ?? (isToggleKind ? false : undefined),
          items,
        })
      },
      onPointerMove: () => {
        if (item.disabled) return
        send({ type: 'item.pointermove', value: item.value, items })
      },
      onPointerLeave: () => {
        send({ type: 'item.pointerleave', value: item.value, items })
      },
      id: `dropdown-menu:${context.id}:item:${item.value}`,
      role:
        item.kind === 'checkbox'
          ? 'menuitemcheckbox'
          : item.kind === 'radio'
            ? 'menuitemradio'
            : 'menuitem',
      selected: isToggleKind ? item.checked === true : highlighted,
      // Items are not tab stops — the content surface owns the single tab stop;
      // arrow-key navigation is roving (machine via highlightedValue).
      focusable: false,
    }
  }

  return {
    open,
    focusTrap: props.focusTrap,
    setOpen(next) {
      if (open === next) return
      send({ type: next ? 'open' : 'close' })
    },
    parts: {
      trigger,
      content,
      separator: { role: 'separator' },
      label: { role: 'presentation' },
      group: { role: 'group' },
    },
    getItem,
    withItems(nextItems) {
      // Resolve a pending trigger-key open intent now that items are known: the
      // machine set `pendingHighlight` on trigger.key.open[.last]; firing
      // `items.ready` applies the highlight once items are mounted.
      if (open && context.pendingHighlight && nextItems.length > 0) {
        send({ type: 'items.ready', items: nextItems })
      }
      return buildApi(snapshot, nextItems)
    },
  }
}

export const connectDropdownMenu: Connect<
  DropdownMenuState,
  DropdownMenuContext,
  DropdownMenuEvent,
  DropdownMenuMachineProps,
  DropdownMenuApi,
  DropdownMenuComputed
> = snapshot => buildApi(snapshot, [])

/**
 * Substrate-agnostic reaction: machine open/closed → consumer onOpenChange,
 * fired identically on every target. (Escape is NOT here — it's a platform
 * listener, so it lives in each target's effects.ts.)
 */
const reaction = makeReaction<
  DropdownMenuState,
  DropdownMenuContext,
  DropdownMenuEvent,
  DropdownMenuMachineProps,
  DropdownMenuComputed
>()

const onOpenChange = reaction(
  m => m.matches('open'),
  (open, props) => props.onOpenChange?.({ open }),
)

connectDropdownMenu.reactions = [onOpenChange]
