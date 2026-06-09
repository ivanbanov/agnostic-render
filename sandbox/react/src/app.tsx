import { useState } from 'react'
import { Accordion } from '@render-experiment/accordion-react'
import { Dialog } from '@render-experiment/dialog-react'
import { DropdownMenu } from '@render-experiment/dropdown-menu-react'
import { Tooltip } from '@render-experiment/tooltip-react'
import {
  Button,
  Card,
  CardHint,
  CardTitle,
  Container,
  Hero,
  Lead,
  Row,
  Title,
  globalStyles,
} from './ui'

export function App() {
  globalStyles()

  const [openCount, setOpenCount] = useState(0)
  const [lastAction, setLastAction] = useState('—')
  const [theme, setTheme] = useState('system')
  const [bookmarks, setBookmarks] = useState({ urls: true, github: false })
  const [openSections, setOpenSections] = useState<string[]>(['shipping'])

  return (
    <Container>
      <Hero>
        <Title>render-experiment</Title>
        <Lead>
          A tooltip, dropdown-menu, dialog, and accordion driven by one substrate-agnostic state
          machine, rendered through the React target.
        </Lead>
      </Hero>

      <Card>
        <CardTitle>Tooltip</CardTitle>
        <CardHint>Hover or focus a trigger. Content is hoverable; Escape dismisses.</CardHint>
        <Row>
          <Tooltip onOpenChange={({ open }) => open && setOpenCount(n => n + 1)}>
            <Tooltip.Trigger>
              <Button>Hover or focus me</Button>
            </Tooltip.Trigger>
            <Tooltip.Content>A simple tooltip</Tooltip.Content>
          </Tooltip>

          <Tooltip openDelay={1200}>
            <Tooltip.Trigger>
              <Button>Patient hover</Button>
            </Tooltip.Trigger>
            <Tooltip.Content>Took a while, huh?</Tooltip.Content>
          </Tooltip>

          <Tooltip placement='right'>
            <Tooltip.Trigger>
              <Button>Right-placed</Button>
            </Tooltip.Trigger>
            <Tooltip.Content>Parked on the right</Tooltip.Content>
          </Tooltip>
        </Row>
        <CardHint>opened {openCount} times</CardHint>
      </Card>

      <Card>
        <CardTitle>Dropdown menu</CardTitle>
        <CardHint>
          Click to open. Arrow keys / Home / End navigate, typeahead matches, Escape closes.
        </CardHint>
        <Row>
          <DropdownMenu>
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
        </Row>
        <CardHint>last action · {lastAction}</CardHint>
      </Card>

      <Card>
        <CardTitle>Dialog</CardTitle>
        <CardHint>
          Modal window: focus traps inside, Escape or clicking the backdrop closes, focus returns to
          the trigger.
        </CardHint>
        <Row>
          <Dialog>
            <Dialog.Trigger>
              <Button tone='primary'>Open dialog</Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay>
                <Dialog.Content>
                  <Dialog.Title>Delete project?</Dialog.Title>
                  <Dialog.Description>
                    This permanently removes the project and all of its data. This action cannot be
                    undone.
                  </Dialog.Description>
                  <Row>
                    <Dialog.Close>Cancel</Dialog.Close>
                    <Dialog.Close>Delete</Dialog.Close>
                  </Row>
                </Dialog.Content>
              </Dialog.Overlay>
            </Dialog.Portal>
          </Dialog>
        </Row>
      </Card>

      <Card>
        <CardTitle>Accordion · single (collapsible)</CardTitle>
        <CardHint>
          One panel open at a time. Click a header to toggle; Arrow keys / Home / End move focus
          between headers.
        </CardHint>
        <Accordion
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
              Free returns within 30 days. The item must be unused and in its original packaging.
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value='warranty' disabled>
            <Accordion.Header>
              <Accordion.Trigger>Warranty (disabled)</Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content>You should not be able to open this one.</Accordion.Content>
          </Accordion.Item>
        </Accordion>
        <CardHint>open · {openSections.length ? openSections.join(', ') : 'none'}</CardHint>
      </Card>

      <Card>
        <CardTitle>Accordion · multiple</CardTitle>
        <CardHint>Each panel toggles independently — any number can be open at once.</CardHint>
        <Accordion type='multiple' defaultValue={['a']}>
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
              One core state machine; the React target supplies the view, focus handling, and styled
              elements.
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Card>
    </Container>
  )
}
