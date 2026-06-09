import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from './render'

/**
 * Compound API mirroring Radix's Accordion surface.
 *
 *   <Accordion type="single" collapsible>
 *     <Accordion.Item value="a">
 *       <Accordion.Header>
 *         <Accordion.Trigger>Section A</Accordion.Trigger>
 *       </Accordion.Header>
 *       <Accordion.Content>Panel A</Accordion.Content>
 *     </Accordion.Item>
 *     <Accordion.Item value="b">
 *       <Accordion.Header>
 *         <Accordion.Trigger>Section B</Accordion.Trigger>
 *       </Accordion.Header>
 *       <Accordion.Content>Panel B</Accordion.Content>
 *     </Accordion.Item>
 *   </Accordion>
 */
export const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Header: AccordionHeader,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
})

export * from './render'
export * from './generated/api'
export * from './context'
