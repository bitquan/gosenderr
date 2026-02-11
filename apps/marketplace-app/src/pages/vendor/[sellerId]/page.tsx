import React from 'react'
import { useParams } from 'react-router-dom'
import SellerStorefront from '@/components/SellerStorefront'
import useSellerProfile from '@/hooks/useSellerProfile'

export default function SellerPage() {
  const { sellerId } = useParams()
  const { profile, items, loading } = useSellerProfile(sellerId as string)

  if (loading) return <div>Loading seller storefront...</div>
  if (!profile) return <div>Seller not found</div>

  return (
    <div style={{maxWidth:900,margin:'0 auto',padding:24}}>
      <SellerStorefront profile={{ id: sellerId, businessName: profile.displayName, description: profile?.sellerProfile?.description }} items={items} />
    </div>
  )
}
