import type { ComponentType, SVGProps } from 'react'
import {
  Airplane,
  ArrowDownLeft,
  ArrowsLeftRight,
  Bank,
  CaretLeft,
  CaretRight,
  ChartBar,
  ChartPieSlice,
  Check,
  CircleDashed,
  Car,
  ForkKnife,
  GameController,
  Gift,
  GraduationCap,
  Heart,
  House,
  Laptop,
  MagnifyingGlass,
  PiggyBank,
  Plant,
  Plus,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Target,
  TrainSimple,
  Wallet,
  X,
} from '@phosphor-icons/react'

/**
 * Icon set: Phosphor, regular weight. Soft, even outlines that sit well
 * next to the serif type. Size comes from CSS; `strokeWidth` is accepted
 * and ignored so callers stay the same if the set changes again.
 */
type IconProps = SVGProps<SVGSVGElement> & { strokeWidth?: number }
export type AppIcon = (props: IconProps) => React.JSX.Element

type PhosphorIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string; weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone' }>

function make(Icon: PhosphorIcon): AppIcon {
  return function AppIconView({ strokeWidth: _strokeWidth, ...props }: IconProps) {
    return <Icon size={24} weight="regular" {...props} />
  }
}

export const IconAdd = make(Plus)
export const IconBank = make(Bank)
export const IconCheck = make(Check)
export const IconChevronLeft = make(CaretLeft)
export const IconChevronRight = make(CaretRight)
export const IconClose = make(X)
export const IconSearch = make(MagnifyingGlass)

/** Tab bar icons. */
export const IconHome = make(House)
export const IconActivity = make(Receipt)
export const IconSpending = make(ChartPieSlice)
export const IconBudgets = make(ChartBar)
export const IconGoals = make(Target)
export const IconSavings = make(PiggyBank)

const CATEGORY_ICONS: Record<string, AppIcon> = {
  groceries: make(ShoppingCart),
  dining: make(ForkKnife),
  'eating out': make(ForkKnife),
  restaurants: make(ForkKnife),
  transport: make(TrainSimple),
  shopping: make(ShoppingBag),
  subscriptions: make(Receipt),
  health: make(Heart),
  housing: IconHome,
  rent: IconHome,
  income: make(ArrowDownLeft),
  transfer: make(ArrowsLeftRight),
  savings: make(Wallet),
  fun: make(GameController),
  entertainment: make(GameController),
  gifts: make(Gift),
  education: make(GraduationCap),
  car: make(Car),
}

const FALLBACK = make(CircleDashed)

export function categoryIcon(category: string): AppIcon {
  return CATEGORY_ICONS[category.toLocaleLowerCase()] ?? FALLBACK
}

export const GOAL_ICON_OPTIONS: Array<{ id: string; label: string; icon: AppIcon }> = [
  { id: 'target', label: 'Goal', icon: IconGoals },
  { id: 'plane', label: 'Travel', icon: make(Airplane) },
  { id: 'shield', label: 'Safety', icon: make(ShieldCheck) },
  { id: 'sprout', label: 'Future', icon: make(Plant) },
  { id: 'home', label: 'Home', icon: IconHome },
  { id: 'laptop', label: 'Tech', icon: make(Laptop) },
  { id: 'gift', label: 'Gift', icon: make(Gift) },
  { id: 'graduation-cap', label: 'Study', icon: make(GraduationCap) },
  { id: 'car', label: 'Car', icon: make(Car) },
  { id: 'heart', label: 'Health', icon: make(Heart) },
]

export function goalIcon(id: string): AppIcon {
  return GOAL_ICON_OPTIONS.find((option) => option.id === id)?.icon ?? IconGoals
}

/** Plain names for built-in categories. */
export function categoryLabel(category: string) {
  if (category === 'Dining') return 'Eating out'
  return category
}
