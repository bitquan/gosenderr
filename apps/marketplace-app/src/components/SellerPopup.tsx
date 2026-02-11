import React from 'react'
import SellerStorefront from './SellerStorefront'

export function SellerPopup({ profile, onClose }: { profile: any; onClose?: () => void }) {
  return (
    <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:700,maxHeight:'80vh',overflow:'auto',background:'#fff',borderRadius:10,padding:16}}>
        <button onClick={onClose} style={{float:'right'}}>Close</button>
        <SellerStorefront profile={profile} items={profile?.sampleItems} />
      </div>
    </div>
  )
}

export default SellerPopup
