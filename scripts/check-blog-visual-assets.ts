import { readdir } from "node:fs/promises"
import path from "node:path"

import { getAllTopArticleVisuals } from "../lib/blog/visuals"

const blogAssetRoot = path.join(process.cwd(), "public", "images", "blog")

async function listWebpFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) return listWebpFiles(entryPath)
      return entry.isFile() && entry.name.endsWith(".webp") ? [entryPath] : []
    }),
  )

  return files.flat()
}

function publicAssetPath(filePath: string): string {
  return `/images/blog/${path.relative(blogAssetRoot, filePath).split(path.sep).join("/")}`
}

function printList(label: string, values: string[]) {
  if (values.length === 0) return
  console.error(`${label}:`)
  for (const value of values) console.error(`  - ${value}`)
}

async function main() {
  const registeredPaths = Object.values(getAllTopArticleVisuals())
    .flatMap((visuals) => visuals.map((visual) => visual.assetPath))
    .filter((assetPath): assetPath is string => Boolean(assetPath))

  const duplicateRegistrations = registeredPaths
    .filter((assetPath, index) => registeredPaths.indexOf(assetPath) !== index)
    .filter((assetPath, index, values) => values.indexOf(assetPath) === index)
    .sort()
  const registered = new Set(registeredPaths)
  const deployed = new Set((await listWebpFiles(blogAssetRoot)).map(publicAssetPath))
  const missing = [...registered].filter((assetPath) => !deployed.has(assetPath)).sort()
  const extra = [...deployed].filter((assetPath) => !registered.has(assetPath)).sort()

  if (duplicateRegistrations.length > 0 || missing.length > 0 || extra.length > 0) {
    console.error(
      `Blog visual asset parity failed: registered=${registered.size} deployed=${deployed.size}`,
    )
    printList("Duplicate registry paths", duplicateRegistrations)
    printList("Missing deployed assets", missing)
    printList("Unregistered deployed assets", extra)
    process.exitCode = 1
    return
  }

  console.log(`Blog visual assets match the registry (${registered.size} files).`)
}

void main()
