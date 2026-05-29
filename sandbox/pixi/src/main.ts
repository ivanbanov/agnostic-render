/**
 * Pixi sandbox — one canvas filling the body, no HTML chrome.
 *
 * Builds a few interactive trigger buttons, attaches a Pixi-rendered
 * tooltip / dropdown to each, and lets the user poke at them.
 */
import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
} from "pixi.js";
import { createDropdownMenu } from "@render-experiment/dropdown-menu-pixi";
import { createTooltip } from "@render-experiment/tooltip-pixi";

// -----------------------------------------------------------------------------
// App boot — fill the window, anti-aliased, dark background.
// -----------------------------------------------------------------------------

const app = new Application();
await app.init({
  resizeTo: window,
  background: "#0b0d12",
  antialias: true,
  resolution: window.devicePixelRatio ?? 1,
  autoDensity: true,
});
document.body.appendChild(app.canvas);

// Overlay layer sits above everything else; tooltips + menus mount here.
const overlay = new Container();

// Big "PIXI" stamped in the middle of the canvas.
const pixiStamp = new Text({
  text: "PIXI",
  style: new TextStyle({
    fill: 0xe5e7eb,
    fontSize: 220,
    fontWeight: "900",
    fontFamily: "system-ui, -apple-system, sans-serif",
    letterSpacing: 12,
  }),
});
pixiStamp.alpha = 0.18;
const placeStamp = () => {
  pixiStamp.x = (window.innerWidth - pixiStamp.width) / 2;
  pixiStamp.y = (window.innerHeight - pixiStamp.height) / 2;
};
placeStamp();
window.addEventListener("resize", placeStamp);
app.stage.addChild(pixiStamp);

// -----------------------------------------------------------------------------
// Status text + counters
// -----------------------------------------------------------------------------

const statusText = new Text({
  text: "(no action yet)",
  style: new TextStyle({
    fill: 0x9ca3af,
    fontSize: 13,
    fontFamily: "system-ui, -apple-system, sans-serif",
  }),
});
statusText.x = 32;
statusText.y = 28;
app.stage.addChild(statusText);

let openCount = 0;
const tooltipCounter = new Text({
  text: "tooltip onOpenChange (open) fired: 0",
  style: new TextStyle({
    fill: 0x6b7280,
    fontSize: 12,
    fontFamily: "system-ui, -apple-system, sans-serif",
  }),
});
tooltipCounter.x = 32;
tooltipCounter.y = 52;
app.stage.addChild(tooltipCounter);

const headline = new Text({
  text: "render-experiment / pixi",
  style: new TextStyle({
    fill: 0xe5e7eb,
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "system-ui, -apple-system, sans-serif",
  }),
});
headline.x = 32;
headline.y = 0;
app.stage.addChild(headline);

const subhead = new Text({
  text: "Imperative tooltip + dropdown on a single canvas. Hover, click, Esc, arrow keys.",
  style: new TextStyle({
    fill: 0x9ca3af,
    fontSize: 12,
    fontFamily: "system-ui, -apple-system, sans-serif",
  }),
});
subhead.x = 240;
subhead.y = 10;
app.stage.addChild(subhead);

// -----------------------------------------------------------------------------
// Button primitive (interactive Graphics + Text)
// -----------------------------------------------------------------------------

function makeButton(label: string, x: number, y: number): Container {
  const node = new Container();
  const bg = new Graphics();
  const text = new Text({
    text: label,
    style: new TextStyle({
      fill: 0xe5e7eb,
      fontSize: 13,
      fontFamily: "system-ui, -apple-system, sans-serif",
    }),
  });
  const px = 14;
  const py = 8;
  text.x = px;
  text.y = py;
  const w = text.width + px * 2;
  const h = text.height + py * 2;
  bg.roundRect(0, 0, w, h, 6);
  bg.fill({ color: 0x1f2937 });
  bg.stroke({ color: 0x374151, width: 1 });
  node.addChild(bg);
  node.addChild(text);
  node.x = x;
  node.y = y;
  return node;
}

function sectionLabel(text: string, x: number, y: number) {
  const t = new Text({
    text,
    style: new TextStyle({
      fill: 0xe5e7eb,
      fontSize: 15,
      fontWeight: "600",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }),
  });
  t.x = x;
  t.y = y;
  app.stage.addChild(t);
}

// -----------------------------------------------------------------------------
// Tooltips section
// -----------------------------------------------------------------------------

sectionLabel("Tooltip", 32, 100);

const basicBtn = makeButton("hover me", 32, 132);
app.stage.addChild(basicBtn);
createTooltip({
  trigger: basicBtn,
  parent: overlay,
  content: "A simple tooltip",
  onOpenChange: ({ open }) => {
    if (!open) return;
    openCount += 1;
    tooltipCounter.text = `tooltip onOpenChange (open) fired: ${openCount}`;
  },
});

const delayedBtn = makeButton("patient hover (1500ms)", 32, 180);
app.stage.addChild(delayedBtn);
createTooltip({
  trigger: delayedBtn,
  parent: overlay,
  content: "Took a while, huh?",
  openDelay: 1500,
});

const rightBtn = makeButton("right-placed", 32, 228);
app.stage.addChild(rightBtn);
createTooltip({
  trigger: rightBtn,
  parent: overlay,
  content: "parked on the right",
  positioning: { placement: "right" },
});

// Skip-delay row
sectionLabel("Skip-delay window — open one then hover the next", 32, 324);
const skip1 = makeButton("1", 32, 356);
const skip2 = makeButton("2", 72, 356);
const skip3 = makeButton("3", 112, 356);
app.stage.addChild(skip1);
app.stage.addChild(skip2);
app.stage.addChild(skip3);
createTooltip({ trigger: skip1, parent: overlay, content: "first" });
createTooltip({ trigger: skip2, parent: overlay, content: "second" });
createTooltip({ trigger: skip3, parent: overlay, content: "third" });

// -----------------------------------------------------------------------------
// DropdownMenu section
// -----------------------------------------------------------------------------

sectionLabel("DropdownMenu", 32, 420);

let bookmarksUrls = true;
let bookmarksGithub = false;
let theme = "system";

const setStatus = (s: string) => {
  statusText.text = `Last action: ${s}`;
};

const menuBtn = makeButton("Open menu", 32, 452);
app.stage.addChild(menuBtn);
createDropdownMenu({
  trigger: menuBtn,
  parent: overlay,
  items: [
    { kind: "label", label: "Actions" },
    { value: "new", label: "New File", onSelect: () => setStatus("new file") },
    { value: "open", label: "Open File…", onSelect: () => setStatus("open file") },
    { value: "save", label: "Save", onSelect: () => setStatus("save") },
    { value: "save-as", label: "Save As… (disabled)", disabled: true },
    { kind: "separator" },
    { value: "quit", label: "Quit", onSelect: () => setStatus("quit") },
  ],
});

const bookmarksBtn = makeButton("Bookmarks", 200, 452);
app.stage.addChild(bookmarksBtn);
const bookmarksMenu = createDropdownMenu({
  trigger: bookmarksBtn,
  parent: overlay,
  items: bookmarkItems(),
});
function bookmarkItems() {
  return [
    {
      value: "urls",
      label: "Show URLs",
      kind: "checkbox" as const,
      checked: bookmarksUrls,
      onSelect: () => {
        bookmarksUrls = !bookmarksUrls;
        setStatus(`bookmarks.urls = ${bookmarksUrls}`);
        bookmarksMenu.setItems(bookmarkItems());
      },
    },
    {
      value: "github",
      label: "Show GitHub",
      kind: "checkbox" as const,
      checked: bookmarksGithub,
      onSelect: () => {
        bookmarksGithub = !bookmarksGithub;
        setStatus(`bookmarks.github = ${bookmarksGithub}`);
        bookmarksMenu.setItems(bookmarkItems());
      },
    },
  ];
}

const themeBtn = makeButton(`Theme: ${theme}`, 340, 452);
app.stage.addChild(themeBtn);
const themeMenu = createDropdownMenu({
  trigger: themeBtn,
  parent: overlay,
  items: themeItems(),
});
function themeItems() {
  const pick = (next: string) => () => {
    theme = next;
    setStatus(`theme = ${theme}`);
    // Update the trigger label too.
    const labelText = themeBtn.getChildAt(1) as Text;
    labelText.text = `Theme: ${theme}`;
    themeMenu.setItems(themeItems());
  };
  return [
    { kind: "label" as const, label: "Theme" },
    {
      value: "light",
      label: "Light",
      kind: "radio" as const,
      checked: theme === "light",
      onSelect: pick("light"),
    },
    {
      value: "dark",
      label: "Dark",
      kind: "radio" as const,
      checked: theme === "dark",
      onSelect: pick("dark"),
    },
    {
      value: "system",
      label: "System",
      kind: "radio" as const,
      checked: theme === "system",
      onSelect: pick("system"),
    },
  ];
}

// -----------------------------------------------------------------------------
// Overlay always on top
// -----------------------------------------------------------------------------

app.stage.addChild(overlay);
