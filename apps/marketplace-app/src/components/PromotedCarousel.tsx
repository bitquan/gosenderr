import React from 'react'

export function PromotedCarousel({ items }: { items: any[] }) {
  return (
    <div style={{display:'flex',gap:8,overflow:'auto',padding:12}}>
      {items.map((it) => (
        <div key={it.id} style={{minWidth:160,border:'1px solid #eee',padding:8,borderRadius:8}}>
          <img src={it.thumbnail} style={{width:'100%',height:100,objectFit:'cover'}}/>
          <div style={{fontWeight:600,marginTop:6}}>{it.title}</div>
          <div style={{color:'#666'}}>${(it.price/100).toFixed(2)}</div>
        </div>
      ))}
    </div>
  )
}

export default PromotedCarousel
