// Saves the current menu from a running server into public/static-menu.json.
// The public GitHub Pages site shows this snapshot (menu preview, no ordering).
//   BASE=http://localhost:3000 pnpm static-menu
import fs from 'node:fs'
const base = process.env.BASE || 'http://localhost:3000'
const res = await fetch(`${base}/api/menu`)
if (!res.ok) throw new Error(`Could not read ${base}/api/menu (${res.status})`)
const { settings, categories } = await res.json()
fs.writeFileSync('public/static-menu.json', JSON.stringify({ settings, categories }, null, 1))
console.log(`Saved ${categories.reduce((n, c) => n + c.items.length, 0)} dishes in ${categories.length} categories`)
