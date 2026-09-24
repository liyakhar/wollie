import {
  ArrowDownLeft,
  ArrowLeftRight,
  Car,
  Circle,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  House,
  Laptop,
  PiggyBank,
  Plane,
  ReceiptText,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sprout,
  Target,
  TrainFront,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'

/** Precise Line: every icon is a 1.5 px monoline in ink. */
export const ICON_STROKE = 1.5

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  groceries: ShoppingCart,
  dining: UtensilsCrossed,
  'eating out': UtensilsCrossed,
  restaurants: UtensilsCrossed,
  transport: TrainFront,
  shopping: ShoppingBag,
  subscriptions: ReceiptText,
  health: Heart,
  housing: House,
  rent: House,
  income: ArrowDownLeft,
  transfer: ArrowLeftRight,
  savings: PiggyBank,
  fun: Gamepad2,
  entertainment: Gamepad2,
  gifts: Gift,
  education: GraduationCap,
  car: Car,
}

export function categoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category.toLocaleLowerCase()] ?? Circle
}

export const GOAL_ICON_OPTIONS: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: 'target', label: 'Goal', icon: Target },
  { id: 'plane', label: 'Travel', icon: Plane },
  { id: 'shield', label: 'Safety', icon: Shield },
  { id: 'sprout', label: 'Future', icon: Sprout },
  { id: 'home', label: 'Home', icon: House },
  { id: 'laptop', label: 'Tech', icon: Laptop },
  { id: 'gift', label: 'Gift', icon: Gift },
  { id: 'graduation-cap', label: 'Study', icon: GraduationCap },
  { id: 'car', label: 'Car', icon: Car },
  { id: 'heart', label: 'Health', icon: Heart },
]

export function goalIcon(id: string): LucideIcon {
  return GOAL_ICON_OPTIONS.find((option) => option.id === id)?.icon ?? Target
}

/** Plain names for built-in categories. */
export function categoryLabel(category: string) {
  if (category === 'Dining') return 'Eating out'
  return category
}
