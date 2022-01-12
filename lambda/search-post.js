const {handle, failure, success} = require("./handle-query")

/**
 * Lambda handler to search the graph.
 */
exports.handler = async (event, context) => {
    return await handle(event, context, async (connection) => {

        const options = JSON.parse(event.body)
        if (!options) {
            return failure("no body in event")
        }

        const result = await connection.search(options)

        return success(result)
    })
}
