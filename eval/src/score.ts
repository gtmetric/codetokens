import { mkdtempSync, writeFileSync, copyFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export type ScoreResult = { passed: boolean; detail?: string }

/**
 * Run a snippet's hidden test suite against candidate code.
 * The fixture imports './subject.ts'; we write `code` as subject.ts in an
 * isolated temp dir, copy the fixture beside it (renamed to a `.test.ts` so bun
 * discovers it there), and run `bun test` with a timeout.
 */
export async function runTests(testPath: string, code: string, timeoutMs = 15000): Promise<ScoreResult> {
  if (code.trim().length === 0) return { passed: false, detail: 'no code produced' }
  const dir = mkdtempSync(join(tmpdir(), 'eval-trial-'))
  try {
    writeFileSync(join(dir, 'subject.ts'), code)
    copyFileSync(testPath, join(dir, 'editcheck.test.ts'))
    const proc = Bun.spawn(['bun', 'test', 'editcheck.test.ts'], {
      cwd: dir,
      stdout: 'pipe',
      stderr: 'pipe',
      signal: AbortSignal.timeout(timeoutMs),
    })
    const stderr = await new Response(proc.stderr).text()
    const stdout = await new Response(proc.stdout).text()
    const exit = await proc.exited
    if (exit === 0) return { passed: true }
    return { passed: false, detail: (stderr || stdout).slice(-600) }
  } catch (err) {
    return { passed: false, detail: `execution error/timeout: ${String(err)}` }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
