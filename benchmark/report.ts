/** Shared reporting helpers for the benchmark suite. */
import type { Bench } from 'tinybench'

export function report(title: string, bench: Bench): void {
  console.log(`\n### ${title}`)
  const rows = bench.tasks.map(t => ({
    name: t.name,
    'ops/sec': t.result ? Math.round(t.result.hz).toLocaleString() : 'n/a',
    'mean (µs)': t.result ? (t.result.mean * 1000).toFixed(3) : 'n/a',
    samples: t.result ? t.result.samples.length : 0,
  }))
  console.table(rows)
}

export function heapMB(): number {
  if (global.gc) global.gc()
  return process.memoryUsage().heapUsed / 1024 / 1024
}
