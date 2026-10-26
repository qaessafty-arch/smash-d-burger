import { Hamburger, Drumstick, Shrimp, CupSoda, type LucideProps } from 'lucide-react'

// Lucide has no fries icon, so this one is drawn in the same 24px / 2px-stroke style.
export function FriesIcon({ size = 24, strokeWidth = 2, ...props }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M8 10 7 3" />
      <path d="M12 10V2" />
      <path d="m16 10 1-7" />
      <path d="M5 10h14l-1.4 11H6.4z" />
    </svg>
  )
}

export const CATEGORY_ICONS = {
  'Meat Burgers': Hamburger,
  'Chicken Burgers': Drumstick,
  Sides: Shrimp,
  Fries: FriesIcon,
  Drinks: CupSoda,
} as const
