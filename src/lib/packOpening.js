import { singles } from './catalog'
import { createPackEngine } from './packEngine'

export const { oddsFor, openPack } = createPackEngine(singles)
