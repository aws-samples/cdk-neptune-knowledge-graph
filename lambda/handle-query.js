const headers = require("./headers")
const gremlin = require("neptune-gremlin")

// Get configuration values from the environment
const host = process.env.NEPTUNE_ENDPOINT
const port = process.env.NEPTUNE_PORT
const useIam = process.env.USE_IAM === "true"

// Create a new connection to the Neptune database
const connection = new gremlin.Connection(host, port, useIam)

/**
 * Handle a lambda request to query Neptune.
 * 
 * @param {*} event 
 * @param {*} context 
 * @param {*} f 
 */
async function handle(event, context, f) {
    console.log(event)
    console.log(context)

    // Make sure the user is logged in via Cognito
    const claims = event.requestContext?.authorizer?.claims
    if (!claims) throw new Error("Missing claims from event")
    console.info({claims})


    // TODO - Re-use this connection for multiple requests to Lambda
    
    console.log(`About to connect to ${host}:${port} useIam:${useIam}`)

    await connection.connect()

    // Get the current partition from headers
    const part = event.headers[PARTITION_HEADER]
    if (!part) {
        return failure(`Missing ${PARTITION_HEADER}`, 400)
    }
    connection.setPartition(part)

    return await f(connection)
}

/**
 * Failure response
 * 
 * @param {*} ex 
 * @param {*} statusCode 
 * @param {*} msg 
 * @returns 
 */
function failure(ex, statusCode, msg) {

    if (!statusCode) {
        statusCode = 500
    }

    if (!msg) {
        msg = "System Error"
    }

    console.error(`${statusCode}: ${msg}\n${ex}`)

    return {
        statusCode,
        headers: {
            "Content-Type": "text/plain",
            "Access-Control-Allow-Headers": "Authorization,Content-Type,X-Amz-Date,X-Amz-Security-Token,X-Api-Key",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
        },
        body: `Request Failed: ${msg}\n`,
    }
}

/**
 * Return success from a lambda rest api function.
 * 
 * @param {*} resp 
 * @returns 
 */
function success(resp) {
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(resp || {}),
    }
}

const PARTITION_HEADER = "x-kg-partition"

module.exports = {handle, success, failure}