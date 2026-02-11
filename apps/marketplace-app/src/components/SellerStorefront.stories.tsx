import React from 'react'
import SellerStorefront from './SellerStorefront'

export default { title: 'Seller/SellerStorefront' }

const profile = { id: 'demo-seller', businessName: 'Demo Store', description: 'A small test store', logo: '', banner: '' }
const items = [ { id: '1', title: 'Apple', price: 199, thumbnail: '' }, { id: '2', title: 'Orange', price: 299, thumbnail: '' } ]

export const Default = () => <div style={{padding:20}}><SellerStorefront profile={profile} items={items} /></div>
