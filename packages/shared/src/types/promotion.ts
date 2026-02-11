export interface Promotion {
  id?: string
  itemId: string
  sellerId: string
  startAt: number // epoch
  endAt: number // epoch
  slot: 'homepage_top' | 'search_sidebar' | 'category_carousel'
  priceCents: number
  active: boolean
  createdAt?: number
  updatedAt?: number
}

export default Promotion
