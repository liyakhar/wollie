import type { ComponentType, SVGProps } from 'react'
import {
  Add,
  ArrowDownLeft,
  ArrowsHorizontal,
  Car,
  ChartColumn,
  Checkmark,
  ChevronLeft,
  ChevronRight,
  CircleDash,
  Close,
  Education,
  Favorite,
  Finance,
  GameConsole,
  Gift,
  Home,
  Laptop,
  Plane,
  Receipt,
  Restaurant,
  Search,
  Security,
  ShoppingBag,
  ShoppingCart,
  Sprout,
  Target,
  Train,
  Wallet,
} from '@carbon/icons-react'

/**
 * Icon set: IBM Carbon — precise, geometric, technical outlines.
 * Size comes from CSS; `strokeWidth` is accepted and ignored so callers
 * stay the same if the set changes again.
 */
type IconProps = SVGProps<SVGSVGElement> & { strokeWidth?: number }
export type AppIcon = (props: IconProps) => React.JSX.Element

type CarbonIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

function make(Icon: CarbonIcon): AppIcon {
  return function AppIconView({ strokeWidth: _strokeWidth, ...props }: IconProps) {
    return <Icon size={24} {...props} />
  }
}

export const IconAdd = make(Add)
export const IconBank = make(Finance)
export const IconCheck = make(Checkmark)
export const IconChevronLeft = make(ChevronLeft)
export const IconChevronRight = make(ChevronRight)
export const IconClose = make(Close)
export const IconSearch = make(Search)

/** Tab bar icons. */
export const IconHome = make(Home)
export const IconActivity = make(Receipt)
export const IconBudgets = make(ChartColumn)
export const IconGoals = make(Target)

const CATEGORY_ICONS: Record<string, AppIcon> = {
  groceries: make(ShoppingCart),
  dining: make(Restaurant),
  'eating out': make(Restaurant),
  restaurants: make(Restaurant),
  transport: make(Train),
  shopping: make(ShoppingBag),
  subscriptions: make(Receipt),
  health: make(Favorite),
  housing: IconHome,
  rent: IconHome,
  income: make(ArrowDownLeft),
  transfer: make(ArrowsHorizontal),
  savings: make(Wallet),
  fun: make(GameConsole),
  entertainment: make(GameConsole),
  gifts: make(Gift),
  education: make(Education),
  car: make(Car),
}

const FALLBACK = make(CircleDash)

export function categoryIcon(category: string): AppIcon {
  return CATEGORY_ICONS[category.toLocaleLowerCase()] ?? FALLBACK
}

export const GOAL_ICON_OPTIONS: Array<{ id: string; label: string; icon: AppIcon }> = [
  { id: 'target', label: 'Goal', icon: IconGoals },
  { id: 'plane', label: 'Travel', icon: make(Plane) },
  { id: 'shield', label: 'Safety', icon: make(Security) },
  { id: 'sprout', label: 'Future', icon: make(Sprout) },
  { id: 'home', label: 'Home', icon: IconHome },
  { id: 'laptop', label: 'Tech', icon: make(Laptop) },
  { id: 'gift', label: 'Gift', icon: make(Gift) },
  { id: 'graduation-cap', label: 'Study', icon: make(Education) },
  { id: 'car', label: 'Car', icon: make(Car) },
  { id: 'heart', label: 'Health', icon: make(Favorite) },
]

export function goalIcon(id: string): AppIcon {
  return GOAL_ICON_OPTIONS.find((option) => option.id === id)?.icon ?? IconGoals
}

/** Plain names for built-in categories. */
export function categoryLabel(category: string) {
  if (category === 'Dining') return 'Eating out'
  return category
}
