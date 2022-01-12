// Create config.js in this directory with these values populated before deploying
const DOMAIN = "your.domain.com"
const CERTIFICATE_ARN = "arn:aws:acm:us-east-1:[your-account-id]:certificate/[certificate-id]"
const HOSTED_ZONE_ID = "your hosted zone id"
module.exports = { DOMAIN, CERTIFICATE_ARN, HOSTED_ZONE_ID }