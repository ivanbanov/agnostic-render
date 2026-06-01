/**
 * styled() — Pixi-flavored equivalent of the Stitches / xwidget factory.
 *
 *   const Content = styled("graphics", contentStyleSpec);
 *
 *   // Later, in render:
 *   const node = Content({ side: "bottom" });
 *   parent.addChild(node.root);
 *   node.setLabel("Hello");
 *   node.dispose();
 *
 * The returned factory always produces a `StyledNode`:
 *   - `root`: a Pixi Container the caller addChilds to a scene
 *   - `apply(selections)`: re-runs variant resolution + repaints
 *   - `setLabel(text)`: present for tags that wrap a Text child ("graphics" / "text")
 *   - `setSize(w, h)`: forces a size; otherwise auto-sizes to label + padding
 *   - `getBounds()`: cached size for positioning
 *   - `dispose()`: tears down Pixi nodes
 *
 * Tag semantics:
 *   - "container": pure layout group. No background paint. Variants can set
 *     `width`, `height`, `visibility`. Used for positioners.
 *   - "graphics": a Graphics-painted box (background + border-radius) +
 *     optional Text child for the label. Used for surfaces with content.
 *   - "text": a Text node with style derived from spec (fontSize/color/etc.).
 *     No box around it.
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { PixiStyleRecord, PixiStyleSpec } from './translate'

export type PixiPrimitive = 'container' | 'graphics' | 'text'

export interface StyledNode {
  /** Pixi node the consumer adds to a parent scene. */
  root: Container
  /** Re-resolve the style with new variant selections + repaint. */
  apply: (selections?: Record<string, unknown>) => void
  /** Set the label text (only meaningful for "graphics" / "text"). */
  setLabel: (text: string | undefined) => void
  /** Force an explicit size; defaults to label-bounds + padding. */
  setSize: (width: number, height: number) => void
  /** Tear down all owned Pixi nodes. */
  dispose: () => void
}

export interface StyledFactory {
  (selections?: Record<string, unknown>): StyledNode
}

// -----------------------------------------------------------------------------
// Style resolution — combine base + variant slots + compound variants
// -----------------------------------------------------------------------------

/** Coerce a variant prop value into the string key used in the spec. */
const slotKey = (v: unknown): string =>
  typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v)

function resolveStyle(spec: PixiStyleSpec, selections: Record<string, unknown>): PixiStyleRecord {
  const merged: PixiStyleRecord = { ...spec.base }

  // Variant slots (last write wins; insertion order of spec.variants)
  for (const [name, options] of Object.entries(spec.variants)) {
    const raw = selections[name] ?? spec.defaultVariants[name]
    if (raw == null) continue
    const slot = options[slotKey(raw)]
    if (!slot) continue
    Object.assign(merged, slot)
  }

  // Compound variants — apply if every named selection matches
  for (const cv of spec.compoundVariants) {
    let matches = true
    for (const [name, expected] of Object.entries(cv)) {
      if (name === 'css') continue
      const actual = selections[name] ?? spec.defaultVariants[name]
      if (slotKey(actual) !== slotKey(expected)) {
        matches = false
        break
      }
    }
    if (matches) Object.assign(merged, cv.css)
  }

  return merged
}

// -----------------------------------------------------------------------------
// styled()
// -----------------------------------------------------------------------------

export function styled(primitive: PixiPrimitive, spec: PixiStyleSpec): StyledFactory {
  return (initialSelections = {}) => {
    if (primitive === 'text') {
      return makeTextNode(spec, initialSelections)
    }
    if (primitive === 'graphics') {
      return makeGraphicsNode(spec, initialSelections)
    }
    return makeContainerNode(spec, initialSelections)
  }
}

// -----------------------------------------------------------------------------
// "container" — pure layout group
// -----------------------------------------------------------------------------

function makeContainerNode(
  spec: PixiStyleSpec,
  initialSelections: Record<string, unknown>,
): StyledNode {
  const root = new Container()
  let selections = { ...initialSelections }
  let labelText: string | undefined
  let explicitSize: { width: number; height: number } | null = null

  const apply = (next?: Record<string, unknown>) => {
    if (next) selections = { ...selections, ...next }
    const style = resolveStyle(spec, selections)
    // visibility variant
    if ('visibility' in style) {
      root.visible = style.visibility === 'visible'
    }
    if (explicitSize) {
      // Containers don't have an intrinsic size in Pixi; mark via hitArea on
      // the consumer side if needed. We track it for callers that introspect.
    }
    void labelText
  }
  apply()

  return {
    root,
    apply,
    setLabel: t => {
      labelText = t
    },
    setSize: (w, h) => {
      explicitSize = { width: w, height: h }
    },
    dispose: () => root.destroy({ children: true }),
  }
}

// -----------------------------------------------------------------------------
// "graphics" — background-painted box + optional label
// -----------------------------------------------------------------------------

function makeGraphicsNode(
  spec: PixiStyleSpec,
  initialSelections: Record<string, unknown>,
): StyledNode {
  const root = new Container()
  const bg = new Graphics()
  const label = new Text({ text: '', style: new TextStyle({ fill: 0xffffff }) })
  root.addChild(bg)
  root.addChild(label)

  let selections = { ...initialSelections }
  let labelText: string | undefined
  let explicitSize: { width: number; height: number } | null = null

  const apply = (next?: Record<string, unknown>) => {
    if (next) selections = { ...selections, ...next }
    const style = resolveStyle(spec, selections)

    // Update label text style first so its measured size is correct.
    label.style = new TextStyle({
      fill: (style.color as number) ?? 0xffffff,
      fontSize: (style.fontSize as number) ?? 13,
      fontFamily: (style.fontFamily as string) ?? 'system-ui, -apple-system, sans-serif',
      fontWeight: ((style.fontWeight as string) ?? 'normal') as 'normal' | 'bold',
    })
    label.text = labelText ?? ''

    // Padding contributes to box size; label is positioned at (px, py).
    const px = (style.paddingX as number) ?? 0
    const py = (style.paddingY as number) ?? 0
    label.x = px
    label.y = py

    const width = explicitSize?.width ?? label.width + px * 2
    const height = explicitSize?.height ?? label.height + py * 2

    bg.clear()
    const radius = (style.borderRadius as number) ?? 0
    if (radius > 0) {
      bg.roundRect(0, 0, width, height, radius)
    } else {
      bg.rect(0, 0, width, height)
    }
    const bgColor = style.background
    if (typeof bgColor === 'number') {
      bg.fill({ color: bgColor })
    } else if (bgColor !== undefined && bgColor !== 'transparent') {
      // String we couldn't translate — fall back to no fill (degrades safely)
    }

    if ('visibility' in style) {
      root.visible = style.visibility === 'visible'
    }
  }
  apply()

  return {
    root,
    apply,
    setLabel: t => {
      labelText = t
      apply()
    },
    setSize: (w, h) => {
      explicitSize = { width: w, height: h }
      apply()
    },
    dispose: () => root.destroy({ children: true }),
  }
}

// -----------------------------------------------------------------------------
// "text" — plain Text node
// -----------------------------------------------------------------------------

function makeTextNode(spec: PixiStyleSpec, initialSelections: Record<string, unknown>): StyledNode {
  const root = new Container()
  const text = new Text({ text: '', style: new TextStyle({ fill: 0xffffff }) })
  root.addChild(text)

  let selections = { ...initialSelections }
  let labelText: string | undefined

  const apply = (next?: Record<string, unknown>) => {
    if (next) selections = { ...selections, ...next }
    const style = resolveStyle(spec, selections)
    text.style = new TextStyle({
      fill: (style.color as number) ?? 0xffffff,
      fontSize: (style.fontSize as number) ?? 13,
      fontFamily: (style.fontFamily as string) ?? 'system-ui, -apple-system, sans-serif',
      fontWeight: ((style.fontWeight as string) ?? 'normal') as 'normal' | 'bold',
    })
    text.text = labelText ?? ''
    if ('visibility' in style) {
      root.visible = style.visibility === 'visible'
    }
  }
  apply()

  return {
    root,
    apply,
    setLabel: t => {
      labelText = t
      apply()
    },
    setSize: () => {
      // Text auto-sizes to content; ignore explicit sizes for now.
    },
    dispose: () => root.destroy({ children: true }),
  }
}
