import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Local, always-available photo used when a remote menu image fails to load.
export const BASE_PATH = '/smash-d-burger'
export const FALLBACK_FOOD_IMAGE = `${BASE_PATH}/smashed-burger-menu.png`

export function onFoodImageError(e: { currentTarget: HTMLImageElement }) {
  const img = e.currentTarget
  if (img.dataset.fallback) return
  img.dataset.fallback = '1'
  img.src = FALLBACK_FOOD_IMAGE
}
