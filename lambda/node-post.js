const {handle, failure, success} = require("./handle-query")

/**
 * Lambda handler to save nodes.
 */
exports.handler = async (event, context) => {
    return await handle(event, context, async (connection) => {

        const node = JSON.parse(event.body)
        console.info("node", node)

        const requiredProps = ["id", "properties", "labels"]
        for (const r of requiredProps) {
            if (!(r in node)) {
                return failure(`node.${r} is not set`, 400)
            }
        }

        await connection.saveNode(node)

        return success("Ok")
    })
}
