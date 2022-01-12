const {handle, success} = require("./handle-query")
const AWS = require("aws-sdk")

/**
 * Lambda handler to save edges.
 */
exports.handler = async (event, context) => {
    return await handle(event, context, async (connection) => {

        // Import a graph saved to S3 via the import-url-get signed URL

        const key = JSON.parse(event.body).key

        console.log(key)
        
        const s3 = new AWS.S3()
        const params = {
            Bucket: process.env.BUCKET_NAME, 
            Key: key, 
        }
        const response = await s3.getObject(params).promise()
        let json = response.Body.toString("utf-8")
        const graph = JSON.parse(json)
        for (const node of graph.nodes) {
            await connection.saveNode(node)
        }
        for (const edge of graph.edges) {
            await connection.saveEdge(edge)
        }

        return success("Ok")
    })
}
