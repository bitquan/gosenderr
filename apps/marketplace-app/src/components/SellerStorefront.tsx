import React from 'react'

export type SellerProfilePublic = {
  id: string
  businessName?: string
  banner?: string
  logo?: string
  description?: string
}

export function SellerStorefront({ profile, items }: { profile: SellerProfilePublic; items?: any[] }) {
  return (
    <div>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {profile.logo ? <img src={profile.logo} alt="logo" width={64} /> : <div style={{width:64,height:64,background:'#eee'}}/>}
        <div>
          <h1 style={{margin:0}}>{profile.businessName || 'Store'}</h1>
          <p style={{margin:0,color:'#666'}}>{profile.description}</p>
        </div>
      </header>

      <section style={{marginTop:16}}>
        <h2>Items</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
          {(items||[]).map((it) => (
            <div key={it.id} style={{border:'1px solid #eee',padding:8,borderRadius:8}}>
              <img src={it.thumbnail} alt={it.title} style={{width:'100%',height:120,objectFit:'cover'}} />
              <div style={{paddingTop:8}}>
                <div style={{fontWeight:600}}>{it.title}</div>
                <div style={{color:'#666'}}>${(it.price/100).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default SellerStorefront
