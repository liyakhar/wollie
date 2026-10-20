import type { Guide } from './guides'
import { guidesA } from './guides-more-a'
import { guidesB } from './guides-more-b'

export const moreGuides: Guide[] = [...guidesA, ...guidesB]
