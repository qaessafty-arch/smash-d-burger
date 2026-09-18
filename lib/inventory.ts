export interface SimulatedInventory {
  [itemName: string]: number
}

export const INITIAL_SIMULATED_INVENTORY: SimulatedInventory = {
  // Low Stock Items (1 - 3 left)
  'Hot Chicken': 3,
  'Dynamite Shrimps (7 pcs)': 2,
  'Dynamite Shrimps': 2,
  'Jalapeño': 3,

  // Limited Availability Items (4 - 6 left)
  'Sweet Heat': 4,
  'Loaded Fries': 4,
  'Jalapeño Poppers (7 pcs)': 5,
  'Jalapeño Poppers': 5,

  // Healthy Stock Items
  'OG Smash': 14,
  'All American': 12,
  'Golden Crunch': 10,
  'Crispy Chicken Tenders (5 pcs)': 8,
  'Crispy Chicken Tenders': 8,
  'Chicken Popcorn': 11,
  'Classic Fries': 25,
  'Curly Fries': 18,
  'Seasoned Fries': 15,
  'Pepsi': 30,
  '7UP': 25,
  'Mirinda': 20,
  'Mineral Water': 40,
}

/**
 * Normalizes item names to find stock even if minor punctuation/suffix differs.
 */
export function getInventoryStock(
  inventory: SimulatedInventory,
  itemName: string,
  fallback = 15
): number {
  if (inventory[itemName] !== undefined) {
    return inventory[itemName]
  }

  // Try matching base name without (X pcs)
  const baseName = itemName.replace(/\s*\(\d+\s*pcs\)/i, '').trim()
  for (const key of Object.keys(inventory)) {
    const keyBase = key.replace(/\s*\(\d+\s*pcs\)/i, '').trim()
    if (keyBase.toLowerCase() === baseName.toLowerCase()) {
      return inventory[key]
    }
  }

  return fallback
}

/**
 * Safely updates stock for an item by subtracting quantity
 */
export function deductStock(
  inventory: SimulatedInventory,
  itemName: string,
  quantity = 1
): SimulatedInventory {
  const current = getInventoryStock(inventory, itemName, 15)
  const nextVal = Math.max(0, current - quantity)

  // Find matching key if exists
  let targetKey = itemName
  const baseName = itemName.replace(/\s*\(\d+\s*pcs\)/i, '').trim()
  for (const key of Object.keys(inventory)) {
    const keyBase = key.replace(/\s*\(\d+\s*pcs\)/i, '').trim()
    if (keyBase.toLowerCase() === baseName.toLowerCase()) {
      targetKey = key
      break
    }
  }

  return {
    ...inventory,
    [targetKey]: nextVal,
  }
}

/**
 * Restores stock when item is removed from cart
 */
export function restoreStock(
  inventory: SimulatedInventory,
  itemName: string,
  quantity = 1
): SimulatedInventory {
  const current = getInventoryStock(inventory, itemName, 15)
  const nextVal = current + quantity

  let targetKey = itemName
  const baseName = itemName.replace(/\s*\(\d+\s*pcs\)/i, '').trim()
  for (const key of Object.keys(inventory)) {
    const keyBase = key.replace(/\s*\(\d+\s*pcs\)/i, '').trim()
    if (keyBase.toLowerCase() === baseName.toLowerCase()) {
      targetKey = key
      break
    }
  }

  return {
    ...inventory,
    [targetKey]: nextVal,
  }
}
