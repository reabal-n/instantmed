import { execSync } from "child_process"
import * as dotenv from "dotenv"
import { existsSync } from "fs"
import path from "path"

function addExistingPath(paths: string[], candidate?: string | null) {
  if (!candidate) return
  const resolved = path.resolve(candidate)
  if (existsSync(resolved) && !paths.includes(resolved)) {
    paths.push(resolved)
  }
}

function getPrimaryCheckoutRoot(cwd: string): string | null {
  try {
    const gitCommonDir = execSync("git rev-parse --git-common-dir", {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
    const absoluteGitCommonDir = path.isAbsolute(gitCommonDir)
      ? gitCommonDir
      : path.resolve(cwd, gitCommonDir)

    return path.basename(absoluteGitCommonDir) === ".git"
      ? path.dirname(absoluteGitCommonDir)
      : null
  } catch {
    return null
  }
}

export function getE2EEnvFiles(cwd = process.cwd()): string[] {
  const files: string[] = []
  const primaryCheckoutRoot = getPrimaryCheckoutRoot(cwd)

  addExistingPath(files, process.env.PLAYWRIGHT_ENV_FILE)
  addExistingPath(files, path.join(cwd, ".env.local"))
  addExistingPath(files, path.join(cwd, ".env"))

  if (primaryCheckoutRoot && primaryCheckoutRoot !== cwd) {
    addExistingPath(files, path.join(primaryCheckoutRoot, ".env.local"))
    addExistingPath(files, path.join(primaryCheckoutRoot, ".env"))
  }

  return files
}

export function loadE2EEnv(cwd = process.cwd()): string[] {
  const files = getE2EEnvFiles(cwd)

  for (const file of files) {
    dotenv.config({ path: file, override: false, quiet: true })
  }

  return files
}
