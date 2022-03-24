// Populate these values for local development
const APIGATEWAY_URL = "" // Get this after deploying knowledge-graph-neptune
const REDIRECT_URI = "" // https://your-custom-domain.something
const COGNITO_DOMAIN = "" // your-custom-domain-replace-dots-with-dashes
const REGION = ""
const APP_CLIENT_ID = "" // Get this after deploying knowledge-graph-cognito

// Leave these alone
const COGNITO_URL = `https://${COGNITO_DOMAIN}.auth.${REGION}.amazoncognito.com`
const PARAMS = `?response_type=code&client_id=${APP_CLIENT_ID}&redirect_uri=${REDIRECT_URI}`
const LOGIN_URL = `${COGNITO_URL}/login${PARAMS}`
const LOGOUT_URL = `${COGNITO_URL}/logout${PARAMS}`
const TARGET_ENV = "dev"

const LOCAL_JWT = "" // Only populate this for local dev, copy jwt.id from a deployed instance

module.exports = { APIGATEWAY_URL, TARGET_ENV, LOGIN_URL, LOGOUT_URL, LOCAL_JWT }
