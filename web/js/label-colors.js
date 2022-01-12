/**
 * Get the color to use for a node
 * 
 * @param {*} graph 
 * @param {String} label 
 * @returns 
 */
function getFillStyle(graph, node) {

    if (!node.labels) return graph.genericColor

    let label = node.labels[0]
    // if (node.label === "person" && 
    //     node.properties.title && 
    //     node.properties.title.toLowerCase() in ["psa", "pdm", "pdr", "bd"]) {
    //     label = label + node.properties.title
    // }

    const idx = graph.knownLabels.indexOf(label)
    if (idx > -1) {
        return graph.labelColors[idx]
    }
    if (graph.knownLabels.length < graph.labelColors.length) {
        graph.knownLabels.push(label)
        return graph.labelColors[graph.knownLabels.length - 1]
    }
    return graph.genericColor
}

/**
 * Generate a color based on a hash of a string.
 * 
 * @param {*} s 
 * @returns 
 */
function hashColor(s) {
    let stringUniqueHash = [...s].reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)
    return `hsl(${stringUniqueHash % 360}, 95%, 35%)`
}

module.exports = { getFillStyle, hashColor }