import { accessSync, constants, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

function isExecutable(path) {
  try {
    accessSync(path, constants.X_OK)
    return statSync(path).isFile()
  } catch {
    return false
  }
}

export function chromeExecutable() {
  const override = process.env.OVERLOAD_CHROME_PATH
  if (override) {
    const path = resolve(override)
    if (!isExecutable(path)) throw Error('OVERLOAD_CHROME_PATH must point to an executable Chrome binary')
    return path
  }

  const { ProgramFiles, 'ProgramFiles(x86)': programFilesX86, LOCALAPPDATA } = process.env
  const candidates = {
    darwin: ['/Applications', join(homedir(), 'Applications')]
      .map(directory => join(directory, 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome')),
    win32: [ProgramFiles ?? 'C:/Program Files', programFilesX86 ?? 'C:/Program Files (x86)', LOCALAPPDATA]
      .filter(Boolean)
      .map(directory => join(directory, 'Google', 'Chrome', 'Application', 'chrome.exe')),
  }[process.platform] ?? []
  const path = candidates.find(isExecutable)
  if (!path) throw Error('Google Chrome was not found. Install Chrome or set OVERLOAD_CHROME_PATH to its executable.')
  return path
}
