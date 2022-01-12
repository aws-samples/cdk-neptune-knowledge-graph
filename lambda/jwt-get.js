const { promisify } = require("util")
const axios = require("axios")
const jsonwebtoken = require("jsonwebtoken")
const jwkToPem = require("jwk-to-pem")
const qs = require("qs")
const { failure, success } = require("./handle-query")

/**
 * Get the cognito issuer URL.
 * 
 * @returns 
 */
function getCognitoIssuer() {
    const region = process.env.COGNITO_REGION
    if (!region) {
        throw new Error("Missing COGNITO_REGION")
    }
    const cognitoPoolId = process.env.COGNITO_POOL_ID
    if (!cognitoPoolId) {
        throw new Error("Missing COGNITO_POOL_ID")
    }
    return `https://cognito-idp.${region}.amazonaws.com/${cognitoPoolId}`
}

let cacheKeys
async function getPublicKeys() {

    const cognitoIssuer = getCognitoIssuer()
    if (cacheKeys) return cacheKeys
    const url = `${cognitoIssuer}/.well-known/jwks.json`
    const publicKeys = await axios.default.get(url)
    cacheKeys = publicKeys.data.keys.reduce((agg, current) => {
        const pem = jwkToPem(current)
        agg[current.kid] = { instance: current, pem }
        return agg
    }, {})
    return cacheKeys
}

const verifyPromised = promisify(jsonwebtoken.verify.bind(jsonwebtoken))

/**
 * Verify the JWT token.
 */
async function verify(token) {
    let result
    try {
        const tokenSections = token.split(".")
        if (tokenSections.length < 2) {
            throw new Error("requested token is invalid")
        }
        const headerJSON = Buffer.from(tokenSections[0], "base64").toString("utf8")
        const header = JSON.parse(headerJSON)
        const keys = await getPublicKeys()
        const key = keys[header.kid]
        if (key === undefined) {
            throw new Error("claim made for unknown kid")
        }
        const claim = await verifyPromised(token, key.pem)

        console.info({ claim })

        const currentSeconds = Math.floor((new Date()).valueOf() / 1000)
        if (currentSeconds > claim.exp || currentSeconds < claim.auth_time) {
            throw new Error("claim is expired or invalid")
        }

        const cognitoIssuer = getCognitoIssuer()
        if (claim.iss !== cognitoIssuer) {
            throw new Error("claim issuer is invalid")
        }
        if (claim.token_use !== "access") {
            throw new Error("claim use is not access")
        }
        console.log(`claim confirmed for ${claim.username}`)

        result = {
            userName: claim.username.replace("AmazonFederate_", ""),
            clientId: claim.client_id,
            isValid: true,
            firstName: claim.given_name,
            lastName: claim.family_name,
            email: claim.email,
        }
    } catch (error) {
        console.log(error)
        result = {
            userName: "",
            clientId: "",
            error,
            isValid: false,
            firstName: "",
            lastName: "",
            email: "",
        }
    }
    return result
}

/**
 * The event handler that verifies the JWT token.
 */
exports.handler = async (event, context) => {
    console.log(event)
    console.log(context)

    try {
        const redirectUri = process.env.COGNITO_REDIRECT_URI
        let cognitoDomainPrefix = process.env.COGNITO_DOMAIN_PREFIX
        const cognitoClientId = process.env.COGNITO_APP_CLIENT_ID
        const cognitoRegion = process.env.COGNITO_REGION

        cognitoDomainPrefix = cognitoDomainPrefix.split(".").join("-")

        console.info("cognitoClientId", cognitoClientId)

        const tokenEndpoint =
            `https://${cognitoDomainPrefix}.auth.${cognitoRegion}.` +
            "amazoncognito.com/oauth2/token"

        console.log(`tokenEndpoint: ${tokenEndpoint}`)

        if (!event.queryStringParameters) {
            return this.failure(null, 400, "Missing code query string parameter")
        }

        const code = event.queryStringParameters.code
        const refresh = event.queryStringParameters.refresh

        let postData

        if (code) {

            console.log(`Verifying ${code}`)

            postData = {
                grant_type: "authorization_code",
                client_id: cognitoClientId,
                code,
                redirect_uri: redirectUri,
            }
        } else {

            if (!refresh) {
                return failure(null, 401, "No refresh token")
            }

            console.log("Refreshing: " + refresh)

            postData = {
                grant_type: "refresh_token",
                client_id: cognitoClientId,
                refresh_token: refresh,
            }
        }

        // Call the Cognito TOKEN endpoint
        let tokenEndpointResp

        console.log(postData)
        const postDataString = qs.stringify(postData)
        console.info("postDataString", postDataString)

        try {
            tokenEndpointResp = await axios.default({
                method: "post",
                url: tokenEndpoint,
                data: postDataString,
                headers: {
                    "content-type": "application/x-www-form-urlencoded;charset=utf-8",
                },
            })
        }
        catch (tokenEndpointEx) {
            // Force the user to log in again.
            // This shouldn't happen but for some reason we see 400s for some 
            // refreshes with no useful error message, and the user is locked out
            // since they can't even see the logout button.
            return failure(tokenEndpointEx, 401, "Token endpoint failed")
        }

        console.log(`token endpoint response: ${JSON.stringify(tokenEndpointResp.data, null, 0)}`)

        const token = tokenEndpointResp.data

        // Verify the token
        let result
        try {
            result = await verify(token.access_token)
            console.info("verify result: ", result)
            if (!result.isValid) {
                throw Error("Invalid verify result")
            }
        } catch (verifyEx) {
            // Force the user to log in again
            return failure(verifyEx, 401, "Token verification failed")
        }

        if (!result) {
            return failure(null, 500, "No token verification result")
        }

        if (!result.userName) {
            return failure(null, 500, "Missing userName")
        }

        console.log(`verify result: ${JSON.stringify(result, null, 0)}`)

        const retval = {
            idToken: token.id_token,
            refreshToken: token.refresh_token || refresh, // Only code gives us refresh
            username: result.userName,
            expiresIn: token.expires_in,
        }
        return success(retval)

    } catch (ex) {
        return failure(ex)
    }
}
