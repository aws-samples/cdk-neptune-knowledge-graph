// Populate these value for local development
const APIGATEWAY_URL = "" // Get this after deploying knowledge-graph-neptune
const REDIRECT_URI = "" // https://your-custom-domain.something
const COGNITO_DOMAIN = "" // your-custom-domain-replace-dots-with-dashes
const REGION = ""
const APP_CLIENT_ID = "" // Get this after deploying knowledge-graph-cognito

// Also create jwt.js that exports JWT, which is jwt.id copied from your cookies 
// after logging in to your deployed instance of the web site.
// Delete the jwt token in that file before deploying the site to your development account.

// Leave these alone
const COGNITO_URL = `https://${COGNITO_DOMAIN}.auth.${REGION}.amazoncognito.com`
const PARAMS = `?response_type=code&client_id=${APP_CLIENT_ID}&redirect_uri=${REDIRECT_URI}`
const LOGIN_URL = `${COGNITO_URL}/login${PARAMS}`
const LOGOUT_URL = `${COGNITO_URL}/logout${PARAMS}`
const TARGET_ENV = "dev"

module.exports = { APIGATEWAY_URL, TARGET_ENV, LOGIN_URL, LOGOUT_URL }