import type { SVGProps } from 'react'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  Add01Icon,
  Airplane01Icon,
  ArrowDataTransferHorizontalIcon,
  ArrowDownLeft01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  BankIcon,
  Cancel01Icon,
  Car01Icon,
  ChartColumnIcon,
  CircleIcon,
  CreditCardIcon,
  FavouriteIcon,
  GameController01Icon,
  GiftIcon,
  Home01Icon,
  LaptopIcon,
  MortarboardIcon,
  PiggyBankIcon,
  Plant01Icon,
  Invoice01Icon,
  Restaurant01Icon,
  Search01Icon,
  Shield01Icon,
  ShoppingBag01Icon,
  ShoppingCart01Icon,
  Target02Icon,
  Tick02Icon,
  Train01Icon,
} from '@hugeicons/core-free-icons'

/**
 * Icon set: Hugeicons "stroke rounded" — thin, fully rounded line icons.
 * One stroke width everywhere; size comes from CSS.
 */
type IconProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & { strokeWidth?: number }
export type AppIcon = (props: IconProps) => React.JSX.Element

const STROKE = 1.6

function make(icon: IconSvgElement): AppIcon {
  return function Icon({ strokeWidth = STROKE, ...props }: IconProps) {
    return <HugeiconsIcon icon={icon} strokeWidth={strokeWidth} size="1em" {...props} />
  }
}

export const IconAdd = make(Add01Icon)
export const IconBank = make(BankIcon)
export const IconCheck = make(Tick02Icon)
export const IconChevronLeft = make(ArrowLeft01Icon)
export const IconChevronRight = make(ArrowRight01Icon)
export const IconClose = make(Cancel01Icon)
export const IconSearch = make(Search01Icon)

/** Tab bar icons. */
export const IconHome = make(Home01Icon)
export const IconActivity = make(CreditCardIcon)
export const IconBudgets = make(ChartColumnIcon)
export const IconGoals = make(Target02Icon)

const CATEGORY_ICONS: Record<string, AppIcon> = {
  groceries: make(ShoppingCart01Icon),
  dining: make(Restaurant01Icon),
  'eating out': make(Restaurant01Icon),
  restaurants: make(Restaurant01Icon),
  transport: make(Train01Icon),
  shopping: make(ShoppingBag01Icon),
  subscriptions: make(Invoice01Icon),
  health: make(FavouriteIcon),
  housing: IconHome,
  rent: IconHome,
  income: make(ArrowDownLeft01Icon),
  transfer: make(ArrowDataTransferHorizontalIcon),
  savings: make(PiggyBankIcon),
  fun: make(GameController01Icon),
  entertainment: make(GameController01Icon),
  gifts: make(GiftIcon),
  education: make(MortarboardIcon),
  car: make(Car01Icon),
}

const FALLBACK = make(CircleIcon)

export function categoryIcon(category: string): AppIcon {
  return CATEGORY_ICONS[category.toLocaleLowerCase()] ?? FALLBACK
}

export const GOAL_ICON_OPTIONS: Array<{ id: string; label: string; icon: AppIcon }> = [
  { id: 'target', label: 'Goal', icon: IconGoals },
  { id: 'plane', label: 'Travel', icon: make(Airplane01Icon) },
  { id: 'shield', label: 'Safety', icon: make(Shield01Icon) },
  { id: 'sprout', label: 'Future', icon: make(Plant01Icon) },
  { id: 'home', label: 'Home', icon: IconHome },
  { id: 'laptop', label: 'Tech', icon: make(LaptopIcon) },
  { id: 'gift', label: 'Gift', icon: make(GiftIcon) },
  { id: 'graduation-cap', label: 'Study', icon: make(MortarboardIcon) },
  { id: 'car', label: 'Car', icon: make(Car01Icon) },
  { id: 'heart', label: 'Health', icon: make(FavouriteIcon) },
]

export function goalIcon(id: string): AppIcon {
  return GOAL_ICON_OPTIONS.find((option) => option.id === id)?.icon ?? IconGoals
}

/** Plain names for built-in categories. */
export function categoryLabel(category: string) {
  if (category === 'Dining') return 'Eating out'
  return category
}
