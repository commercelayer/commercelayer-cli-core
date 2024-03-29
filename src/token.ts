import jwt from 'jsonwebtoken'
import config from './config'
import https from 'https'
import { isProvisioningApp, type AppAuth } from './application'
import { sleep } from './util'
import { type ApiMode, baseURL } from './api'
import { CLIError } from '@oclif/core/lib/errors'
import { core, provisioning, type TClientCredentials, type TPassword, type TProvisioningOptions } from '@commercelayer/js-auth'



export type AuthScope = string | string[]


export type AccessToken = {
  accessToken: string;
  tokenType: 'bearer' | 'Bearer';
  expiresIn: number;
  expires: Date;
  scope: AuthScope;
  createdAt: number;
  error?: string;
  errorDescription?: string;
}



export type AccessTokenInfo = {
  organization?: {
    id: string;
    slug: string;
  };
  application: {
    id: string;
    kind: 'integration' | 'sales_channel' | 'user';
    public: boolean;
  };
  test: boolean;
  exp?: number;
  rand?: number;
  owner?: {
    id: string;
    type: 'Customer' | 'User';
  };
  market?: {
    id: string[];
    price_list_id: string;
    stock_location_ids?: string[];
    geocoder_id?: string;
    allows_external_prices: boolean;
  };
  scope?: AuthScope,
  user?: { id: string }
}


export type CustomToken = {
  accessToken: string;
  info: AccessTokenInfo;
  expMinutes: number;
}



/** Decode a Commerce Layer access token */
const decodeAccessToken = (accessToken: string): AccessTokenInfo => {
  const info = jwt.decode(accessToken)
  if (info === null) throw new Error('Error decoding access token')
  return info as AccessTokenInfo
}


/** generate a custom access token */
const generateAccessToken = (token: AccessTokenInfo, sharedSecret: string, minutes: number): CustomToken => {

  const tokenData = token

  const payload = {
    ...tokenData,
    exp: Math.floor(Date.now() / 1000) + (minutes * 60),
    rand: Math.random(),
  }

  const algo = config.api.token_encoding_algorithm as jwt.Algorithm

  const accessToken = jwt.sign(payload, sharedSecret, { algorithm: algo, noTimestamp: true })
  const info = jwt.verify(accessToken, sharedSecret, { algorithms: [algo] })


  return {
    accessToken,
    info: info as AccessTokenInfo,
    expMinutes: minutes,
  }

}


const getAccessToken = async (auth: AppAuth): Promise<AccessToken> => {

  let accessToken

  if (isProvisioningApp(auth)) accessToken = await getAccessTokenProvisioning(auth)
  else {

    const scope = auth.scope ? (Array.isArray(auth.scope) ? auth.scope.map(s => s.trim()).join(',') : auth.scope) : ''

    const credentials: any = {
      clientId: auth.clientId,
      clientSecret: auth.clientSecret,
      slug: auth.slug,
      domain: auth.domain,
      scope
    }

    if (auth.email && auth.password) {
      credentials.username = auth.email
      credentials.password = auth.password
      accessToken = await core.authentication('password', credentials as TPassword)
    }
    else accessToken = await core.authentication('client_credentials', credentials as TClientCredentials)

  }

  if (!accessToken) throw new Error('Unable to get access token')
  else
  if (accessToken.error) throw new Error(`Unable to get access token: ${accessToken.error}`)

  return accessToken

}


const getAccessTokenProvisioning = async (auth: AppAuth): Promise<AccessToken> => {

  const credentials: TProvisioningOptions = {
    clientId: auth.clientId,
    clientSecret: auth.clientSecret,
    domain: auth.domain
  }

  return provisioning.authentication(credentials)

}


const revokeAccessToken = async (app: AppAuth, token: string, logger?: { log: (msg: any) => void }): Promise<void> => {

  /*
  return axios
    .post(`${app.baseUrl}/oauth/revoke`, {
    grant_type: 'client_credentials',
    client_id: app.clientId,
    client_secret: app.clientSecret,
    token,
    })
  */
  const scope = Array.isArray(app.scope) ? app.scope.join(';') : app.scope

  const data = JSON.stringify({
    grant_type: 'client_credentials',
    client_id: app.clientId,
    client_secret: app.clientSecret,
    scope,
    token,
  })

  const provisioning = isProvisioningApp(app)
  const contentType = provisioning ? 'application/vnd.api+json' : 'application/json'
  const slug = provisioning ? 'auth' : app.slug || ''

  const options = {
    hostname: baseURL(slug, app.domain).replace('https://', '').replace('http://', ''),
    port: 443,
    path: '/oauth/revoke',
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'Content-Length': data.length,
    },
  }

  if (logger) logger.log(options)
  if (logger) logger.log(data)

  let err = false

  try {

    const req = https.request(options/* , res => {
    console.log(`statusCode: ${res.statusCode}`)

    res.on('data', d => {
      process.stdout.write(d)
    })
  } */)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    req.on('error', error => {
      err = true
      throw new CLIError(error.message || 'Error revoking access token')
    })

    req.write(data)
    req.end()

  } catch (error) {
    err = true
    if (logger) logger.log((error as Error).message)
    if (error instanceof CLIError) throw error
    else throw new CLIError((error as Error).message || 'Error revoking access token')
  }

  await sleep(300)
  if (!err && logger) logger.log('Access token revoked')

}


/*
const revokeAccessTokenAxios = async (app: AppAuth, token: string, logger?: { log: (msg: any) => void }): Promise<void> => {

  const scope = Array.isArray(app.scope) ? app.scope.join(';') : app.scope

  const data = {
    grant_type: 'client_credentials',
    client_id: app.clientId,
    client_secret: app.clientSecret,
    scope,
    token,
  }
  if (logger) logger.log(data)
 
  try {
    await axios.post(`${baseURL(app.slug, app.domain)}/oauth/revoke`, data, { headers: { 'Content-Type': 'application/json' }})
  } catch (error) {
    if (logger) logger.log((error as Error).message)
    if (error instanceof CLIError) throw error
    else throw new CLIError((error as Error).message || 'Error revoking access token')
  }

  await sleep(300)
  if (logger) logger.log('Access token revoked')

}
*/


const isAccessTokenExpiring = (tokenData: AccessToken): boolean => {

  const safetyInterval = 30 // secs

  const now = Math.floor(Date.now() / 1000) // secs
  const expiration = Math.floor(new Date(tokenData.expires).getTime() / 1000) // secs

  return (now >= (expiration - safetyInterval))

}


const getTokenEnvironment = (token: string | AccessTokenInfo): ApiMode => {
  const decodedToken = ((typeof token === 'string') ? decodeAccessToken(token) : token)
  return decodedToken.test ? 'test' : 'live'
}


export { decodeAccessToken, generateAccessToken, getAccessToken, revokeAccessToken, isAccessTokenExpiring, getTokenEnvironment }
