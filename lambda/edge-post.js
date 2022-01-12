const {handle, failure, success} = require("./handle-query")

/**
 * Lambda handler to save edges.
 */
exports.handler = async (event, context) => {
    return await handle(event, context, async (connection) => {

        const edge = JSON.parse(event.body)
        console.info("Edge", edge)

        const requiredProps = ["id", "from", "to", "properties", "label"]
        for (const r of requiredProps) {
            if (!(r in edge)) {
                return failure(null, 400, `edge.${r} is not set`)
            }
        }

        await connection.saveEdge(edge)

        return success("Ok")
    })
}
