#!/usr/bin/env node
const cdk = require("aws-cdk-lib")
const NeptuneStack = require("../lib/knowledge-graph-stack")
const CognitoStack = require("../lib/cognito-stack")
const WebsiteStack = require("../lib/website-stack")
const config = require("./config")

const app = new cdk.App()

// These values should be exported from bin/config.js, which is git ignored.
// For a real pipeline, hard code these values into the stages.
const domain = config.DOMAIN
const certificateArn = config.CERTIFICATE_ARN
const hostedZoneId = config.HOSTED_ZONE_ID

// Static site
// Needs to be re-deployed after fixing web/config.js with Cognito values
new WebsiteStack(app, "knowledge-graph-website", {
    domain,
    certificateArn,
    hostedZoneId,
})

const siteUrl = "https://" + domain

// Cognito User Pool (Simple username passwords to protect the API, no federation)
const cognitoStack = new CognitoStack(app, "knowledge-graph-cognito", {
    siteUrl,
})

// VPC, Neptune cluster, Lambda functions, rest api
new NeptuneStack(app, "knowledge-graph-neptune", {
    terminationProtection: true,
    userPool: cognitoStack.userPool,
    cognitoRedirectUri: siteUrl,
    cognitoDomainPrefix: domain,
    cognitoAppClientId: cognitoStack.appClient.userPoolClientId,
    cognitoRegion: cognitoStack.userPool.env.region,
    cognitoPoolId: cognitoStack.userPool.userPoolId,
    domain,
})

app.synth()
