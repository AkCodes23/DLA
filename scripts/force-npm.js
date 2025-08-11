#!/usr/bin/env node

// Force npm usage and clean up other package managers
const fs = require("fs")
const path = require("path")

const filesToRemove = ["package-lock.json", "yarn.lock", "bun.lockb", "pnpm-lock.yaml", ".pnpm-store", "bunfig.toml"]

filesToRemove.forEach((file) => {
  const filePath = path.join(process.cwd(), file)
  if (fs.existsSync(filePath)) {
    if (fs.lstatSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true })
    } else {
      fs.unlinkSync(filePath)
    }
    console.log(`Removed ${file}`)
  }
})

console.log("Forced npm usage - cleaned up other package manager files")
