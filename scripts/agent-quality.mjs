import { readdir, readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { join } from 'node:path'

const skillRoot = '.agents/skills'
const skills = await readdir(skillRoot, { withFileTypes: true })
const skillFiles = skills.filter((entry) => entry.isDirectory()).map((entry) => join(skillRoot, entry.name, 'SKILL.md'))
if (skillFiles.length < 3) throw new Error(`Expected the three repository skills; found ${skillFiles.length}.`)
for (const path of skillFiles) {
  const content = await readFile(path, 'utf8')
  if (!/^---\nname: [a-z0-9-]+\ndescription: .+\n---\n/m.test(content)) throw new Error(`Invalid Agent Skill frontmatter: ${path}`)
  console.log(`Skill metadata valid: ${path}`)
}

const [guide, appSource, theme, polish] = await Promise.all([
  readFile('AGENTS.md', 'utf8'),
  readFile('src/App.tsx', 'utf8'),
  readFile('src/theme.css', 'utf8'),
  readFile('src/finish-polish.css', 'utf8'),
])
for (const invariant of ['never silently rearrange', 'user approval', 'personal data']) {
  if (!guide.toLocaleLowerCase().includes(invariant.toLocaleLowerCase())) throw new Error(`AGENTS.md is missing product invariant: ${invariant}`)
}
if (!appSource.includes('app-shell theme-sage')) throw new Error('The reviewed sage theme is not applied to the application shell.')
if (!theme.includes('--purple:#397466') || !polish.includes('prefers-reduced-motion')) throw new Error('Theme is missing its sage token or reduced-motion support.')
console.log('Product guardrails and sage theme checks passed.')

const commands = [
  ['npm', ['run', 'build']],
  ['npm', ['test']],
  ['npm', ['--prefix', 'worker', 'run', 'typecheck']],
  ['npm', ['--prefix', 'worker', 'run', 'test']],
  ['git', ['diff', '--check']],
]
for (const [command, args] of commands) {
  console.log(`\n> ${command} ${args.join(' ')}`)
  const result = await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' })
    child.on('error', reject)
    child.on('close', (code) => resolve(code ?? 1))
  })
  if (result !== 0) process.exit(result)
}
console.log('\nDaytask quality checks passed. Browser visual review is not part of this CI job.')
