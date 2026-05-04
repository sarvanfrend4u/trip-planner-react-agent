// ─────────────────────────────────────────────
// DATA STORE
//
// Reads and writes three files in the user's
// chosen folder on their hard drive:
//
//   memory.json       — facts about the user (auto-saved)
//   rules.json        — behavioural rules (user confirmed)
//   system_prompt.txt — base agent instructions
//
// Uses the File System Access API via fileSystem.js.
// ─────────────────────────────────────────────

import { getFolder, pickFolder } from "./fileSystem.js"

const DEFAULT_SYSTEM_PROMPT =
`You are a trip cost planning assistant. Your job is to research real travel costs and give users an accurate budget breakdown.

You have two tools:
- web_search: search the web for real travel costs (flights, hotels, food, activities)
- calculate_total: sum all costs and check against the user's budget

Chain of Thought — before your first tool call, write out:
1. What cost categories do I need to research? (flights, hotels, food, activities, local transport, visa if international)
2. What specific search query will I use for each category?
3. What order will I search in?

Rules:
- Never guess or assume numbers — always use web_search to get real data
- Search for each category one at a time
- Always call calculate_total as your last tool call
- Always use ₹ (INR) amounts
- Always include a 10% contingency buffer in the final total`

// The active folder handle — set on init or setup
let folderHandle = null

// ── Initialisation ─────────────────────────────

// Called on app start — tries to restore folder access
// Returns true if storage is ready, false if setup needed
export async function initStorage() {
  folderHandle = await getFolder()
  return folderHandle !== null
}

// Called when user clicks "Choose Folder" — shows picker
// Creates default files if they don't exist yet
export async function setupStorage() {
  folderHandle = await pickFolder()
  await ensureFile("memory.json",      "[]")
  await ensureFile("rules.json",       "[]")
  await ensureFile("system_prompt.txt", DEFAULT_SYSTEM_PROMPT)
  return true
}

// ── Internal helpers ────────────────────────────

async function ensureFile(name, defaultContent) {
  try {
    await readFile(name)
  } catch {
    await writeFile(name, defaultContent)
  }
}

async function readFile(name) {
  const fileHandle = await folderHandle.getFileHandle(name)
  const file       = await fileHandle.getFile()
  return await file.text()
}

async function writeFile(name, content) {
  const fileHandle = await folderHandle.getFileHandle(name, { create: true })
  const writable   = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

// ── Memory (facts about the user — auto-saved) ──

export async function getMemory() {
  try {
    return JSON.parse(await readFile("memory.json"))
  } catch {
    return []
  }
}

export async function addMemoryFact(fact) {
  const memory = await getMemory()
  if (!memory.includes(fact)) {
    memory.push(fact)
    await writeFile("memory.json", JSON.stringify(memory, null, 2))
  }
}

// ── Rules (behavioural — user confirmed) ────────

export async function getRules() {
  try {
    return JSON.parse(await readFile("rules.json"))
  } catch {
    return []
  }
}

export async function addRule(rule) {
  const rules = await getRules()
  if (!rules.includes(rule)) {
    rules.push(rule)
    await writeFile("rules.json", JSON.stringify(rules, null, 2))
  }
}

export async function removeRule(rule) {
  const rules   = await getRules()
  const updated = rules.filter(r => r !== rule)
  await writeFile("rules.json", JSON.stringify(updated, null, 2))
}

// ── System prompt ────────────────────────────────

export async function getSystemPrompt() {
  try {
    return await readFile("system_prompt.txt")
  } catch {
    return DEFAULT_SYSTEM_PROMPT
  }
}

export async function saveSystemPrompt(prompt) {
  await writeFile("system_prompt.txt", prompt)
}
