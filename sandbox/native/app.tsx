import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Tooltip, TooltipProvider } from '@render-experiment/tooltip-native'
import { DropdownMenu } from '@render-experiment/dropdown-menu-native'
import { Dialog } from '@render-experiment/dialog-native'
import { Accordion } from '@render-experiment/accordion-native'

// Premium light surface — mirrors the React sandbox: soft gray → white gradient,
// a centered container, white cards with a soft shadow, clean buttons.

function Button({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'primary'
}) {
  return (
    <View style={[styles.button, tone === 'primary' && styles.buttonPrimary]}>
      <Text style={[styles.buttonText, tone === 'primary' && styles.buttonTextPrimary]}>
        {children}
      </Text>
    </View>
  )
}

export default function App() {
  const [openCount, setOpenCount] = useState(0)
  const [lastAction, setLastAction] = useState('—')
  const [theme, setTheme] = useState('system')
  const [bookmarks, setBookmarks] = useState({ urls: true, github: false })
  const [openSections, setOpenSections] = useState<string[]>(['shipping'])

  return (
    <View style={styles.root}>
      <TooltipProvider>
        <StatusBar style='dark' />
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.hero}>
            <Text style={styles.title}>render-experiment</Text>
            <Text style={styles.lead}>
              A tooltip, dropdown-menu, dialog, and accordion driven by one substrate-agnostic state
              machine, rendered through the React Native target.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tooltip</Text>
            <Text style={styles.cardHint}>Long-press a chip. Only one is open at a time.</Text>
            <View style={styles.row}>
              <Tooltip
                id='tip-1'
                openDelay={200}
                onOpenChange={({ open }) => open && setOpenCount(c => c + 1)}
              >
                <Tooltip.Trigger>
                  <Button>Long-press me</Button>
                </Tooltip.Trigger>
                <Tooltip.Content>Hello from the agnostic tooltip</Tooltip.Content>
              </Tooltip>

              <Tooltip id='tip-2' openDelay={200}>
                <Tooltip.Trigger>
                  <Button>Or me</Button>
                </Tooltip.Trigger>
                <Tooltip.Content>Only one tooltip is open at a time.</Tooltip.Content>
              </Tooltip>
            </View>
            <Text style={styles.cardHint}>opened {openCount} times</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dropdown menu</Text>
            <Text style={styles.cardHint}>Tap to open · items, checkbox, radio.</Text>
            <View style={styles.row}>
              <DropdownMenu id='menu-1'>
                <DropdownMenu.Trigger>
                  <Button tone='primary'>Open menu</Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  <DropdownMenu.Label>Actions</DropdownMenu.Label>
                  <DropdownMenu.Item value='new' onSelect={() => setLastAction('new')}>
                    New
                  </DropdownMenu.Item>
                  <DropdownMenu.Item value='open' onSelect={() => setLastAction('open')}>
                    Open…
                  </DropdownMenu.Item>
                  <DropdownMenu.Item value='save-as' disabled>
                    Save As… (disabled)
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />

                  <DropdownMenu.Label>Bookmarks</DropdownMenu.Label>
                  <DropdownMenu.CheckboxItem
                    value='urls'
                    checked={bookmarks.urls}
                    onCheckedChange={c => setBookmarks(b => ({ ...b, urls: c }))}
                  >
                    <DropdownMenu.ItemIndicator />
                    Show URLs
                  </DropdownMenu.CheckboxItem>
                  <DropdownMenu.CheckboxItem
                    value='github'
                    checked={bookmarks.github}
                    onCheckedChange={c => setBookmarks(b => ({ ...b, github: c }))}
                  >
                    <DropdownMenu.ItemIndicator />
                    Show GitHub
                  </DropdownMenu.CheckboxItem>
                  <DropdownMenu.Separator />

                  <DropdownMenu.Label>Theme · {theme}</DropdownMenu.Label>
                  <DropdownMenu.RadioGroup value={theme} onValueChange={setTheme}>
                    <DropdownMenu.RadioItem value='light'>
                      <DropdownMenu.ItemIndicator>●</DropdownMenu.ItemIndicator>
                      Light
                    </DropdownMenu.RadioItem>
                    <DropdownMenu.RadioItem value='dark'>
                      <DropdownMenu.ItemIndicator>●</DropdownMenu.ItemIndicator>
                      Dark
                    </DropdownMenu.RadioItem>
                    <DropdownMenu.RadioItem value='system'>
                      <DropdownMenu.ItemIndicator>●</DropdownMenu.ItemIndicator>
                      System
                    </DropdownMenu.RadioItem>
                  </DropdownMenu.RadioGroup>
                </DropdownMenu.Content>
              </DropdownMenu>
            </View>
            <Text style={styles.cardHint}>last action · {lastAction}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dialog</Text>
            <Text style={styles.cardHint}>
              Modal window: tap the backdrop or Android back to close.
            </Text>
            <View style={styles.row}>
              <Dialog>
                <Dialog.Trigger>
                  <Button tone='primary'>Open dialog</Button>
                </Dialog.Trigger>
                <Dialog.Overlay>
                  <Dialog.Content>
                    <Dialog.Title>Delete project?</Dialog.Title>
                    <Dialog.Description>
                      This permanently removes the project and all of its data. This action cannot
                      be undone.
                    </Dialog.Description>
                    <View style={styles.dialogFooter}>
                      <Dialog.Close>
                        <Button>Cancel</Button>
                      </Dialog.Close>
                      <Dialog.Close>
                        <Button tone='primary'>Delete</Button>
                      </Dialog.Close>
                    </View>
                  </Dialog.Content>
                </Dialog.Overlay>
              </Dialog>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Accordion · single (collapsible)</Text>
            <Text style={styles.cardHint}>One panel open at a time. Tap a header to toggle.</Text>
            <Accordion
              id='faq'
              type='single'
              collapsible
              value={openSections}
              onValueChange={({ value }) => setOpenSections(value)}
            >
              <Accordion.Item value='shipping'>
                <Accordion.Header>
                  <Accordion.Trigger>Shipping</Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content>
                  Orders ship within 2 business days. Tracking is emailed once the carrier scans the
                  package.
                </Accordion.Content>
              </Accordion.Item>
              <Accordion.Item value='returns'>
                <Accordion.Header>
                  <Accordion.Trigger>Returns</Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content>
                  Free returns within 30 days. The item must be unused and in its original
                  packaging.
                </Accordion.Content>
              </Accordion.Item>
              <Accordion.Item value='warranty' disabled>
                <Accordion.Header>
                  <Accordion.Trigger>Warranty (disabled)</Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content>You should not be able to open this one.</Accordion.Content>
              </Accordion.Item>
            </Accordion>
            <Text style={styles.cardHint}>
              open · {openSections.length ? openSections.join(', ') : 'none'}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Accordion · multiple</Text>
            <Text style={styles.cardHint}>Each panel toggles independently.</Text>
            <Accordion id='about' type='multiple' defaultValue={['a']}>
              <Accordion.Item value='a'>
                <Accordion.Header>
                  <Accordion.Trigger>What is it?</Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content>
                  A headless accordion driven by the same substrate-agnostic machine as the other
                  components on this page.
                </Accordion.Content>
              </Accordion.Item>
              <Accordion.Item value='b'>
                <Accordion.Header>
                  <Accordion.Trigger>How is it built?</Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content>
                  One core state machine; the native target supplies the view, touch handling, and
                  styled elements.
                </Accordion.Content>
              </Accordion.Item>
            </Accordion>
          </View>
        </ScrollView>
      </TooltipProvider>
    </View>
  )
}

const styles = StyleSheet.create({
  // Soft light-gray → white gradient via RN core's experimental_backgroundImage
  // (no native module needed — works in the prebuilt dev client). Mirrors the
  // React sandbox's CSS gradient.
  root: {
    flex: 1,
    backgroundColor: '#f4f6fa',
    experimental_backgroundImage: 'linear-gradient(180deg, #eef1f6 0%, #ffffff 60%)',
  },
  container: {
    paddingTop: 88,
    paddingBottom: 120,
    paddingHorizontal: 24,
    gap: 24,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  hero: { gap: 10, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5, color: '#0d0f16' },
  lead: { fontSize: 16, lineHeight: 24, color: '#5b6172' },
  dialogFooter: { flexDirection: 'row', gap: 12, marginTop: 4 },

  card: {
    gap: 14,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(13,15,22,0.06)',
    // Soft premium shadow.
    shadowColor: '#0d0f16',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0d0f16' },
  cardHint: { fontSize: 13, lineHeight: 18, color: '#8990a0' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },

  button: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(13,15,22,0.1)',
    shadowColor: '#0d0f16',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonPrimary: { backgroundColor: '#4658e0', borderColor: 'transparent' },
  buttonText: { fontSize: 14, fontWeight: '600', color: '#1c1e26' },
  buttonTextPrimary: { color: '#ffffff' },
})
