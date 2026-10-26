import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Local, always-available photo used when a remote menu image fails to load.
// Static GitHub Pages build only: the site lives under /smash-d-burger and has no server.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
export const STATIC_SITE = process.env.NEXT_PUBLIC_STATIC_SITE === '1'
export const FALLBACK_FOOD_IMAGE = `${BASE_PATH}/menu-photo.jpg`

export function onFoodImageError(e: { currentTarget: HTMLImageElement }) {
  const img = e.currentTarget
  if (img.dataset.fallback) return
  img.dataset.fallback = '1'
  img.src = FALLBACK_FOOD_IMAGE
}
