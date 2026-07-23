// Quick sanity test for HMRC sandbox credentials.
// Run from the project root:
//   node --env-file=.env.local scripts/test-hmrc.mjs

const id = process.env.HMRC_CLIENT_ID
const secret = process.env.HMRC_CLIENT_SECRET
const base = process.env.HMRC_API_BASE

if (!id || !secret || !base) {
  console.error('Missing HMRC_CLIENT_ID, HMRC_CLIENT_SECRET, or HMRC_API_BASE in .env.local')
  process.exit(1)
}

console.log('1) Requesting OAuth token via client_credentials...')
const tokenRes = await fetch(`${base}/oauth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: id,
    client_secret: secret,
    grant_type: 'client_credentials',
    scope: 'hello',
  }),
})
const tokenJson = await tokenRes.json()
console.log('   Status:', tokenRes.status)
console.log('   Body:', tokenJson)

if (!tokenJson.access_token) {
  console.error('No access_token returned. Stopping.')
  process.exit(1)
}

console.log('\n2) Calling /hello/application with the token...')
const appRes = await fetch(`${base}/hello/application`, {
  headers: {
    Accept: 'application/vnd.hmrc.1.0+json',
    Authorization: `Bearer ${tokenJson.access_token}`,
  },
})
console.log('   Status:', appRes.status)
console.log('   Body:', await appRes.text())
