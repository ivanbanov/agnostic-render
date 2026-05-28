import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Tooltip, TooltipProvider } from "@render-experiment/tooltip-native";
import { DropdownMenu } from "@render-experiment/dropdown-menu-native";

export default function App() {
  const [openCount, setOpenCount] = useState(0);
  const [lastAction, setLastAction] = useState("(nothing yet)");
  const [theme, setTheme] = useState("system");
  const [bookmarks, setBookmarks] = useState({ urls: true, github: false });

  return (
    <TooltipProvider>
      <View style={styles.container}>
        <StatusBar style="auto" />
        <Text style={styles.title}>render-experiment / native</Text>
        <Text style={styles.subtitle}>
          Long-press a chip to open its tooltip. Tap the menu button below to try the dropdown.
          {"\n"}Tooltip opens: {openCount} Last menu action: {lastAction}
        </Text>

        <Text style={styles.section}>Tooltip</Text>
        <View style={styles.row}>
          <Tooltip
            red
            id="tip-1"
            openDelay={200}
            onOpenChange={({ open }) => {
              if (open) setOpenCount((c) => c + 1);
            }}
          >
            <Tooltip.Trigger>
              <View style={styles.chip}>
                <Text style={styles.chipText}>Long-press me</Text>
              </View>
            </Tooltip.Trigger>
            <Tooltip.Content>Hello from the agnostic tooltip</Tooltip.Content>
          </Tooltip>

          <View style={{ width: 16 }} />

          <Tooltip id="tip-2" openDelay={200}>
            <Tooltip.Trigger>
              <View style={[styles.chip, { backgroundColor: "#3a5" }]}>
                <Text style={styles.chipText}>Or me</Text>
              </View>
            </Tooltip.Trigger>
            <Tooltip.Content>Only one tooltip is open at a time.</Tooltip.Content>
          </Tooltip>
        </View>

        <Text style={styles.section}>DropdownMenu — items + checkbox + radio</Text>
        <View style={styles.row}>
          <DropdownMenu id="menu-1">
            <DropdownMenu.Trigger>
              <View style={[styles.chip, { backgroundColor: "#357" }]}>
                <Text style={styles.chipText}>Open menu</Text>
              </View>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Label>Actions</DropdownMenu.Label>
              <DropdownMenu.Item value="new" onSelect={() => setLastAction("new")}>
                New
              </DropdownMenu.Item>
              <DropdownMenu.Item value="open" onSelect={() => setLastAction("open")}>
                Open…
              </DropdownMenu.Item>
              <DropdownMenu.Item value="save-as" disabled>
                Save As… (disabled)
              </DropdownMenu.Item>
              <DropdownMenu.Separator />

              <DropdownMenu.Label>Bookmarks</DropdownMenu.Label>
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
              <DropdownMenu.Separator />

              <DropdownMenu.Label>Theme: {theme}</DropdownMenu.Label>
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
        </View>
      </View>
    </TooltipProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
    padding: 24,
    paddingTop: 80,
  },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 8 },
  subtitle: { color: "#666", marginBottom: 32, lineHeight: 20 },
  section: { fontSize: 14, fontWeight: "600", marginTop: 24, marginBottom: 8, color: "#333" },
  row: { flexDirection: "row", alignItems: "center" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#357",
    borderRadius: 8,
  },
  chipText: { color: "#fff", fontWeight: "500" },
});
