const { post } = require("./rest-api")
const render = require("./render")

/**
 * Query the database and focus on a single node or reset to view everything.
 * 
 * @param {*} graph 
 * @param {*} node 
 */
async function focusOn(graph, node, focus = true) {
    let searchResult
    try {
        const options = {}
        if (focus) {
            options.focus = {
                label: node.labels[0],
                key: "name",
                value: node.properties.name,
            }
        }
        searchResult = await post("search-post", options, graph.partition)
    } catch (ex) {
        console.error(ex)
        searchResult = {}
    }
    graph.data = searchResult
    graph.offset = {
        x: 0,
        y: 0,
    }
    render(graph, true)
}

module.exports = focusOn