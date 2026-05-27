import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  Tooltip,
  TooltipProvider,
} from "@render-experiment/tooltip-native";

export default function App() {
  const [openCount, setOpenCount] = useState(0);

  return (
    <TooltipProvider>
      <View style={styles.container}>
        <StatusBar style="auto" />
        <Text style={styles.title}>render-experiment / tooltip-rn</Text>
        <Text style={styles.subtitle}>
          Long-press the chip to open the tooltip. Release to close.
          {"\n"}Opens so far: {openCount}
        </Text>

        <View style={styles.row}>
          <Tooltip
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
  row: { flexDirection: "row", alignItems: "center" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#357",
    borderRadius: 8,
  },
  chipText: { color: "#fff", fontWeight: "500" },
});
