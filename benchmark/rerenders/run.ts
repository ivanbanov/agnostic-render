/**
 * jsdom bootstrap for the re-render benchmark, then run it. DISPOSABLE.
 *
 * Run: pnpm tsx benchmark/rerenders/run.ts
 */
import { JSDOM } from 'jsdom'

// Set up a DOM before importing react-dom.
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' })
const g = globalThis as unknown as Record<string, unknown>
g.window = dom.window
g.document = dom.window.document
g.navigator = dom.window.navigator
g.HTMLElement = dom.window.HTMLElement
g.Node = dom.window.Node
// React 18/19 act() env flag
g.IS_REACT_ACT_ENVIRONMENT = true

async function main() {
  const { runRerenderBench } = await import('./bench')
  console.log('React re-render benchmark (disposable). Node', process.version)
  await runRerenderBench(100, 50)
  await runRerenderBench(1000, 50)
}
main().catch(e => {
  console.error(e)
  process.exit(1)
})
