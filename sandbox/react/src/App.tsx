import { useState } from "react";
import { DropdownMenu } from "@render-experiment/dropdown-menu-react";
import { Tooltip } from "@render-experiment/tooltip-react";

export function App() {
  const [openCount, setOpenCount] = useState(0);

  return (
    <div
      style={{
        padding: 48,
        fontFamily: "system-ui, sans-serif",
        display: "grid",
        gap: 32,
        maxWidth: 720,
      }}
    >
      <header>
        <h1>render-experiment / tooltip</h1>
        <p style={{ color: "#555" }}>
          Hand-authored tooltip on top of our agnostic <code>machine</code> layer. Hover, focus,
          escape, interactive content, and controlled mode all wired through logical handlers — no
          DOM coupling in the machine layer.
        </p>
        <p style={{ color: "#888", fontSize: 13 }}>onOpenChange fired (open): {openCount}</p>
      </header>

      <section>
        <h2>Basic</h2>
        <Tooltip onOpenChange={({ open }) => open && setOpenCount((n) => n + 1)}>
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
        <h2>Interactive (hover the tooltip to keep it open)</h2>
        <Tooltip interactive>
          <Tooltip.Trigger>
            <button>interactive tooltip</button>
          </Tooltip.Trigger>
          <Tooltip.Content>
            You can <a href="#">click links</a> in here.
          </Tooltip.Content>
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
        <Tooltip positioning={{ placement: "right" }}>
          <Tooltip.Trigger>
            <button>right-placed</button>
          </Tooltip.Trigger>
          <Tooltip.Content>parked on the right</Tooltip.Content>
        </Tooltip>
      </section>

      <section>
        <h2>Skip-delay window</h2>
        <p style={{ color: "#888", fontSize: 13 }}>
          Open one tooltip, then quickly hover the next — the second opens instantly.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <Tooltip red>
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
        <DropdownMenuDemos />
      </section>
    </div>
  );
}

function DropdownMenuDemos() {
  const [lastAction, setLastAction] = useState<string>("(nothing yet)");
  const [bookmarks, setBookmarks] = useState({ urls: true, github: false });
  const [theme, setTheme] = useState("system");

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <p style={{ color: "#888", fontSize: 13 }}>
        Last action: <code>{lastAction}</code>
      </p>

      <section>
        <h3>Basic — items + label + separator</h3>
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <button>Open menu</button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Label>Actions</DropdownMenu.Label>
            <DropdownMenu.Item value="new" onSelect={() => setLastAction("new file")}>
              New File
            </DropdownMenu.Item>
            <DropdownMenu.Item value="open" onSelect={() => setLastAction("open file")}>
              Open File…
            </DropdownMenu.Item>
            <DropdownMenu.Item value="save" onSelect={() => setLastAction("save")}>
              Save
            </DropdownMenu.Item>
            <DropdownMenu.Item value="save-as" disabled>
              Save As… (disabled)
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item value="quit" onSelect={() => setLastAction("quit")}>
              Quit
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </section>

      <section>
        <h3>Checkbox items</h3>
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <button>Bookmarks</button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.CheckboxItem
              value="urls"
              checked={bookmarks.urls}
              onCheckedChange={(c) => setBookmarks((b) => ({ ...b, urls: c }))}
            >
              <DropdownMenu.ItemIndicator />
              Show URLs
            </DropdownMenu.CheckboxItem>
            <DropdownMenu.CheckboxItem
              value="github"
              checked={bookmarks.github}
              onCheckedChange={(c) => setBookmarks((b) => ({ ...b, github: c }))}
            >
              <DropdownMenu.ItemIndicator />
              Show GitHub
            </DropdownMenu.CheckboxItem>
          </DropdownMenu.Content>
        </DropdownMenu>
      </section>

      <section>
        <h3>Radio group</h3>
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <button>Theme: {theme}</button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Label>Theme</DropdownMenu.Label>
            <DropdownMenu.RadioGroup value={theme} onValueChange={setTheme}>
              <DropdownMenu.RadioItem value="light">
                <DropdownMenu.ItemIndicator>●</DropdownMenu.ItemIndicator>
                Light
              </DropdownMenu.RadioItem>
              <DropdownMenu.RadioItem value="dark">
                <DropdownMenu.ItemIndicator>●</DropdownMenu.ItemIndicator>
                Dark
              </DropdownMenu.RadioItem>
              <DropdownMenu.RadioItem value="system">
                <DropdownMenu.ItemIndicator>●</DropdownMenu.ItemIndicator>
                System
              </DropdownMenu.RadioItem>
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu>
      </section>

      <section>
        <h3>Groups</h3>
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <button>Categories</button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Group>
              <DropdownMenu.Label>Fruits</DropdownMenu.Label>
              <DropdownMenu.Item value="apple">Apple</DropdownMenu.Item>
              <DropdownMenu.Item value="banana">Banana</DropdownMenu.Item>
              <DropdownMenu.Item value="cherry">Cherry</DropdownMenu.Item>
            </DropdownMenu.Group>
            <DropdownMenu.Separator />
            <DropdownMenu.Group>
              <DropdownMenu.Label>Vegetables</DropdownMenu.Label>
              <DropdownMenu.Item value="asparagus">Asparagus</DropdownMenu.Item>
              <DropdownMenu.Item value="broccoli">Broccoli</DropdownMenu.Item>
              <DropdownMenu.Item value="carrot">Carrot</DropdownMenu.Item>
            </DropdownMenu.Group>
          </DropdownMenu.Content>
        </DropdownMenu>
      </section>
    </div>
  );
}
