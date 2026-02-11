import * as functions from 'firebase-functions'

// Stub function to run on schedule or on promotion write to expire promotions
export const expirePromotions = functions.pubsub.schedule('every 5 minutes').onRun(async (ctx) => {
  console.log('Expire promotions job running (stub)')
  // TODO: query promotions where endAt < now and active == true and set active=false
  return { ok: true }
})
