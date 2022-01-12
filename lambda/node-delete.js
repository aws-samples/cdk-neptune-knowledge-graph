const {handle, failure, success} = require("./handle-query")

/**
 * Lambda handler to delete nodes.
 */
exports.handler = async (event, context) => {
    return await handle(event, context, async (connection) => {

        const id = event.pathParameters.id

        if (!id) {
            return failure(null, 400, "Missing id")
        }

        await connection.deleteNode(id)

        return success("Ok")
    })
}
