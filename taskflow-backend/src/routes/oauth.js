import express from 'express'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { query } from '../db.js'
import { signToken } from '../middleware/auth.js'
import { sendVerificationEmail } from '../email.js'

const router = express.Router()

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000'

const stateStore = new Map() 
const STATE_TTL_MS = 10 * 60 * 1000

function createState(provider, linkUserId = null) {
  const state = crypto.randomBytes(24).toString('hex')
  stateStore.set(state, { provider, createdAt: Date.now(), linkUserId })
  for (const [k, v] of stateStore.entries()) {
    if (Date.now() - v.createdAt > STATE_TTL_MS) stateStore.delete(k)
  }
  return state
}

function consumeState(state, provider) {
  const entry = stateStore.get(state)
  if (!entry) return null
  stateStore.delete(state)
  if (entry.provider !== provider) return null
  if (Date.now() - entry.createdAt > STATE_TTL_MS) return null
  return entry
}

function resolveLinkUserId(req) {
  if (!req.query.link) return null
  const token = req.query.token || (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    return payload.sub || null
  } catch {
    return null
  }
}

function sanitizeUser(u) {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    username: u.username,
    avatar_url: u.avatar_url,
    email_verified: !!u.email_verified,
    auth_provider: u.auth_provider,
    is_admin: !!u.is_admin,
  }
}

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO = 'https://openidconnect.googleapis.com/v1/userinfo'

router.get('/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) return res.status(503).send('Google OAuth не настроен')
  const linkUserId = resolveLinkUserId(req)
  const state = createState('google', linkUserId)
  const redirect = `${SERVER_URL}/api/auth/oauth/google/callback`
  const url = new URL(GOOGLE_AUTH)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirect)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', state)
  url.searchParams.set('access_type', 'online')
  url.searchParams.set('prompt', 'select_account')
  res.redirect(url.toString())
})

router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query
    if (!code) return res.redirect(`${FRONTEND_URL}/login?error=oauth_no_code`)
    const stateEntry = consumeState(state, 'google')
    if (!stateEntry) {
      return res.redirect(`${FRONTEND_URL}/login?error=oauth_invalid_state`)
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirect = `${SERVER_URL}/api/auth/oauth/google/callback`

    const tokenRes = await fetch(GOOGLE_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirect, grant_type: 'authorization_code',
      }),
    })
    const tokens = await tokenRes.json()
    if (!tokens.access_token) {
      console.error('Google token error:', tokens)
      return res.redirect(`${FRONTEND_URL}/login?error=oauth_token`)
    }

    const userRes = await fetch(GOOGLE_USERINFO, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const profile = await userRes.json()
    return finalizeOAuthLogin(res, {
      provider: 'google',
      providerId: profile.sub,
      email: profile.email,
      emailVerified: !!profile.email_verified,
      fullName: profile.name,
      avatar: profile.picture,
      linkUserId: stateEntry.linkUserId,
    })
  } catch (err) {
    console.error('Google callback error:', err)
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`)
  }
})

const YANDEX_AUTH = 'https://oauth.yandex.ru/authorize'
const YANDEX_TOKEN = 'https://oauth.yandex.ru/token'
const YANDEX_USERINFO = 'https://login.yandex.ru/info'

router.get('/yandex', (req, res) => {
  const clientId = process.env.YANDEX_CLIENT_ID
  if (!clientId) return res.status(503).send('Yandex OAuth не настроен')
  const linkUserId = resolveLinkUserId(req)
  const state = createState('yandex', linkUserId)
  const url = new URL(YANDEX_AUTH)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('state', state)
  url.searchParams.set('redirect_uri', `${SERVER_URL}/api/auth/oauth/yandex/callback`)
  res.redirect(url.toString())
})

router.get('/yandex/callback', async (req, res) => {
  try {
    const { code, state } = req.query
    if (!code) return res.redirect(`${FRONTEND_URL}/login?error=oauth_no_code`)
    const stateEntry = consumeState(state, 'yandex')
    if (!stateEntry) {
      return res.redirect(`${FRONTEND_URL}/login?error=oauth_invalid_state`)
    }
    const clientId = process.env.YANDEX_CLIENT_ID
    const clientSecret = process.env.YANDEX_CLIENT_SECRET

    const tokenRes = await fetch(YANDEX_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })
    const tokens = await tokenRes.json()
    if (!tokens.access_token) {
      console.error('Yandex token error:', tokens)
      return res.redirect(`${FRONTEND_URL}/login?error=oauth_token`)
    }

    const userRes = await fetch(YANDEX_USERINFO, {
      headers: { Authorization: `OAuth ${tokens.access_token}` },
    })
    const profile = await userRes.json()
    return finalizeOAuthLogin(res, {
      provider: 'yandex',
      providerId: profile.id,
      email: profile.default_email,
      emailVerified: true,
      fullName: profile.real_name || profile.display_name || profile.login,
      avatar: profile.default_avatar_id
        ? `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`
        : null,
      linkUserId: stateEntry.linkUserId,
    })
  } catch (err) {
    console.error('Yandex callback error:', err)
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`)
  }
})

async function finalizeOAuthLogin(res, { provider, providerId, email, emailVerified, fullName, avatar, linkUserId }) {
  if (!email) {
    return res.redirect(`${FRONTEND_URL}/login?error=oauth_no_email`)
  }
  const idColumn = provider === 'google' ? 'google_id' : 'yandex_id'

  if (linkUserId) {
    const conflict = await query(
      `SELECT id FROM dbo.users WHERE ${idColumn} = @pid AND id <> @uid`,
      { pid: providerId, uid: linkUserId }
    )
    if (conflict.recordset.length) {
      return res.redirect(`${FRONTEND_URL}/settings?error=oauth_already_linked`)
    }
    await query(
      `UPDATE dbo.users SET ${idColumn} = @pid WHERE id = @id`,
      { pid: providerId, id: linkUserId }
    )
    return res.redirect(`${FRONTEND_URL}/settings?linked=${provider}`)
  }

  let r = await query(
    `SELECT * FROM dbo.users WHERE ${idColumn} = @pid`,
    { pid: providerId }
  )
  let user = r.recordset[0]

  if (!user) {
    r = await query(`SELECT * FROM dbo.users WHERE email = @email`, { email })
    user = r.recordset[0]
    if (user) {
      await query(
        `UPDATE dbo.users
         SET ${idColumn} = @pid,
             email_verified = 1,
             avatar_url = COALESCE(avatar_url, @avatar),
             full_name = COALESCE(NULLIF(full_name, ''), @fullName)
         WHERE id = @id`,
        { pid: providerId, avatar: avatar || null, fullName: fullName || null, id: user.id }
      )
      const r2 = await query(`SELECT * FROM dbo.users WHERE id = @id`, { id: user.id })
      user = r2.recordset[0]
    }
  }

  if (!user) {
    const ins = await query(
      `INSERT INTO dbo.users (email, full_name, avatar_url, email_verified, auth_provider, ${idColumn})
       OUTPUT INSERTED.*
       VALUES (@email, @fullName, @avatar, @ev, @provider, @pid)`,
      {
        email,
        fullName: fullName || null,
        avatar: avatar || null,
        ev: emailVerified ? 1 : 0,
        provider,
        pid: providerId,
      }
    )
    user = ins.recordset[0]
  }

  const safe = sanitizeUser(user)
  const token = signToken(safe)

  const url = new URL(`${FRONTEND_URL}/oauth/callback`)
  url.searchParams.set('token', token)
  url.searchParams.set('user', Buffer.from(JSON.stringify(safe)).toString('base64'))
  res.redirect(url.toString())
}

export default router
