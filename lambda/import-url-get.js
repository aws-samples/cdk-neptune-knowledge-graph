const {handle, success} = require("./handle-query")
const AWS = require("aws-sdk")

/**
 * Lambda handler to create a signed URL to put an import file to S3
 */
exports.handler = async (event, context) => {
    return await handle(event, context, async () => {

        const s3 = new AWS.S3()
        const key = decodeURIComponent(event.pathParameters.id)
        const params = {
            Bucket: process.env.BUCKET_NAME, 
            Key: key, 
            ContentType: "application/json",
        }
        const signedUrl = await s3.getSignedUrl("putObject", params)

        return success(signedUrl)
    })
}
