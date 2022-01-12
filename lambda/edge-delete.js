const {handle, failure, success} = require("./handle-query")

/**
 * Lambda handler to delete edges.
 */
exports.handler = async (event, context) => {
    return await handle(event, context, async (connection) => {

        const id = event.pathParameters.id

        if (!id) {
            return failure(null, 400, "Missing id")
        }

        await connection.deleteEdge(id)

        return success("Ok")
    })
}
