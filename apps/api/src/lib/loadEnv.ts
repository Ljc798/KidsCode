import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

function parseEnvFile(content: string) {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq <= 0) continue

    const key = line.slice(0, eq).trim()
    if (!key || process.env[key] !== undefined) continue

    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

const cwd = process.cwd()
const roots = [cwd, path.resolve(cwd, ".."), path.resolve(cwd, "../..")]
const candidates = roots.flatMap(root => [
  path.join(root, ".env"),
  path.join(root, ".env.local"),
  path.join(root, "apps/api/.env"),
  path.join(root, "apps/api/.env.local")
])

for (const file of candidates) {
  if (!existsSync(file)) continue
  parseEnvFile(readFileSync(file, "utf8"))
}
