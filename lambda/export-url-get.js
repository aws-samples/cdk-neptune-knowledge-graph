const {handle, success} = require("./handle-query")
const AWS = require("aws-sdk")

/**
 * Lambda handler to export a snapshot of the current data set to 
 * a JSON file in S3, and then return a signed URL.
 */
exports.handler = async (event, context) => {
    return await handle(event, context, async (connection) => {

        const allData = await connection.search({})
        const s3 = new AWS.S3()
        const d = new Date().toISOString()
        const key = d.split(":").join("-").split(".").join("-") + ".json"
        const params = {
            Body: JSON.stringify(allData), 
            Bucket: process.env.BUCKET_NAME, 
            Key: key, 
        }
        await s3.putObject(params).promise()
        delete params.Body
        const signedUrl = await s3.getSignedUrl("getObject", params)

        return success(signedUrl)
    })
}
