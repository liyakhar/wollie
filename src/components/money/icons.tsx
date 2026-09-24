import {
  Airplane,
  ArrowDownLeft,
  ArrowsLeftRight,
  Car,
  CircleDashed,
  ForkKnife,
  GameController,
  Gift,
  GraduationCap,
  Heartbeat,
  House,
  Laptop,
  PiggyBank,
  Plant,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Target,
  Train,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react'

/**
 * Icon set: Phosphor, "duotone" weight. A crisp ink outline with a soft
 * tinted fill — modern and calm. Size comes from CSS.
 */
export type AppIcon = PhosphorIcon
export const ICON_WEIGHT = 'duotone' as const

const CATEGORY_ICONS: Record<string, AppIcon> = {
  groceries: ShoppingCart,
  dining: ForkKnife,
  'eating out': ForkKnife,
  restaurants: ForkKnife,
  transport: Train,
  shopping: ShoppingBag,
  subscriptions: Receipt,
  health: Heartbeat,
  housing: House,
  rent: House,
  income: ArrowDownLeft,
  transfer: ArrowsLeftRight,
  savings: PiggyBank,
  fun: GameController,
  entertainment: GameController,
  gifts: Gift,
  education: GraduationCap,
  car: Car,
}

export function categoryIcon(category: string): AppIcon {
  return CATEGORY_ICONS[category.toLocaleLowerCase()] ?? CircleDashed
}

export const GOAL_ICON_OPTIONS: Array<{ id: string; label: string; icon: AppIcon }> = [
  { id: 'target', label: 'Goal', icon: Target },
  { id: 'plane', label: 'Travel', icon: Airplane },
  { id: 'shield', label: 'Safety', icon: ShieldCheck },
  { id: 'sprout', label: 'Future', icon: Plant },
  { id: 'home', label: 'Home', icon: House },
  { id: 'laptop', label: 'Tech', icon: Laptop },
  { id: 'gift', label: 'Gift', icon: Gift },
  { id: 'graduation-cap', label: 'Study', icon: GraduationCap },
  { id: 'car', label: 'Car', icon: Car },
  { id: 'heart', label: 'Health', icon: Heartbeat },
]

export function goalIcon(id: string): AppIcon {
  return GOAL_ICON_OPTIONS.find((option) => option.id === id)?.icon ?? Target
}

/** Plain names for built-in categories. */
export function categoryLabel(category: string) {
  if (category === 'Dining') return 'Eating out'
  return category
}
