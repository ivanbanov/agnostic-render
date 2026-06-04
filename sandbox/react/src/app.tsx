import { useState } from 'react'
// NOTE: dropdown-menu is temporarily dropped from the sandbox while it's being
// migrated to the new signals engine (task #17). Re-enable the import + the
// <DropdownMenuDemos /> section below once dropdown-menu-core compiles again.
// import { DropdownMenu } from '@render-experiment/dropdown-menu-react'
import { Tooltip } from '@render-experiment/tooltip-react'

export function App() {
  const [openCount, setOpenCount] = useState(0)

  return (
    <div
      style={{
        padding: 48,
        fontFamily: 'system-ui, sans-serif',
        display: 'grid',
        gap: 32,
        maxWidth: 720,
      }}
    >
      <header>
        <h1>render-experiment / tooltip</h1>
        <p style={{ color: '#555' }}>
          Hand-authored tooltip on top of our agnostic <code>machine</code> layer. Hover, focus,
          escape, interactive content, and controlled mode all wired through logical handlers — no
          DOM coupling in the machine layer.
        </p>
        <p style={{ color: '#888', fontSize: 13 }}>onOpenChange fired (open): {openCount}</p>
      </header>

      <section>
        <h2>Basic</h2>
        <Tooltip onOpenChange={({ open }) => open && setOpenCount(n => n + 1)}>
          <Tooltip.Trigger>
            <button>hover or focus me</button>
          </Tooltip.Trigger>
          <Tooltip.Content>A simple tooltip</Tooltip.Content>
        </Tooltip>
      </section>

      <section>
        <h2>Long openDelay (1500ms)</h2>
        <Tooltip openDelay={1500}>
          <Tooltip.Trigger>
            <button>patient hover</button>
          </Tooltip.Trigger>
          <Tooltip.Content>Took a while, huh?</Tooltip.Content>
        </Tooltip>
      </section>

      <section>
        <h2>Hoverable content (default)</h2>
        <Tooltip>
          <Tooltip.Trigger>
            <button>hoverable tooltip</button>
          </Tooltip.Trigger>
          <Tooltip.Content>
            You can <a href='#'>click links</a> in here.
          </Tooltip.Content>
        </Tooltip>
      </section>

      <section>
        <h2>disableHoverableContent (closes on pointer leave)</h2>
        <Tooltip disableHoverableContent>
          <Tooltip.Trigger>
            <button>non-hoverable tooltip</button>
          </Tooltip.Trigger>
          <Tooltip.Content>Pointer must stay on trigger.</Tooltip.Content>
        </Tooltip>
      </section>

      <section>
        <h2>Disabled</h2>
        <Tooltip disabled>
          <Tooltip.Trigger>
            <button>disabled</button>
          </Tooltip.Trigger>
          <Tooltip.Content>You should not see me</Tooltip.Content>
        </Tooltip>
      </section>

      <section>
        <h2>Placement: right</h2>
        <Tooltip placement='right'>
          <Tooltip.Trigger>
            <button>right-placed</button>
          </Tooltip.Trigger>
          <Tooltip.Content>parked on the right</Tooltip.Content>
        </Tooltip>
      </section>

      <section>
        <h2>Skip-delay window</h2>
        <p style={{ color: '#888', fontSize: 13 }}>
          Open one tooltip, then quickly hover the next — the second opens instantly.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Tooltip>
            <Tooltip.Trigger>
              <button>1</button>
            </Tooltip.Trigger>
            <Tooltip.Content>first</Tooltip.Content>
          </Tooltip>
          <Tooltip>
            <Tooltip.Trigger>
              <button>2</button>
            </Tooltip.Trigger>
            <Tooltip.Content>second</Tooltip.Content>
          </Tooltip>
          <Tooltip>
            <Tooltip.Trigger>
              <button>3</button>
            </Tooltip.Trigger>
            <Tooltip.Content>third</Tooltip.Content>
          </Tooltip>
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>dropdown-menu</h2>
        <p style={{ color: '#888', fontSize: 13 }}>
          Temporarily disabled while dropdown-menu migrates to the new engine (task #17).
        </p>
      </section>
    </div>
  )
}
