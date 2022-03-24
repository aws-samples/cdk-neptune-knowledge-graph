import * as util from "./web-util"

/**
 * An iterator function that yields the next point on the spiral.
 */
function* spiral() {
    const d = 20 // Math.random() * 20 + 20
    let angle = 1 // Math.random() * (Math.PI * 2)
    const maxSteps = 10000
    for (let i = 0; i < maxSteps; i++) {
        let radius = Math.sqrt(i + 1)
        angle += Math.asin(1 / radius)
        let x = Math.cos(angle) * (radius * d)
        let y = Math.sin(angle) * (radius * d)
        yield { x, y }
    }
    return maxSteps
}

/**
* Figure out where to draw the node.
* 
* Sets node.x and node.y
* 
* @param {*} graph 
* @param {*} node 
*/
export default function locateNode(graph, node) {

    if (node.x !== undefined || node.y !== undefined) {
        console.error("Unexpected node x,y are already defined")
    }

    // console.log("Locating node ", node.id)

    const DISTANCE_BETWEEN_NODES = graph.NODE_RADIUS * 5

    // const canvas = graph.canvas
    // const ctx = canvas.getContext("2d")
    const w = graph.width
    const h = graph.height
    const cw = w / 2
    const ch = h / 2

    // Default to starting at the center
    let startx = cw
    let starty = ch

    // If the node points to another node, start there
    if (node.to && node.to.length > 0) {
        const to = graph.nodes.get(node.to[0])
        if (to.x !== undefined) {
            startx = to.x
            starty = to.y
        }
    }

    let x = startx
    let y = starty

    // Look for the closest open location to a relationship.
    // Try progressive x,y coordinates moving in an outward spiral.
    // Test for overlap, leaving padding so they aren't too crowded.
    // If there is no overlap, draw it there, otherwise take another step.
    // TODO - Introduce slight random numbers so it's not too regular
    const s = spiral()
    let foundLocation = false
    while (!foundLocation) {

        // ctx.fillRect(x, y, 2, 2)
        // console.log(`Trying ${x} ${y}`)

        // Check each other node for a hit
        let hitSomething = false
        for (const [, n] of graph.nodes) {
            // console.info("Checking node", n)
            if (n.x === undefined || n.id === node.id) {
                continue
            }
            if (util.hitTest(graph, x, y, DISTANCE_BETWEEN_NODES, n.x, n.y)) {
                hitSomething = true
                break
            }
        }

        // If we hit something, spiral out a little further
        if (hitSomething) {
            const nextTry = s.next()
            if (nextTry.done) {
                console.log("nextTry generator done")
                return
            }
            // console.log({nextTry})
            x = nextTry.value.x + startx
            y = nextTry.value.y + starty

            // // Draw a dot for troubleshooting
            // ctx.fillStyle = "gray"
            // ctx.fillRect(x, y, 2, 2)
        } else {
            foundLocation = true
        }
    }

    node.x = x
    node.y = y
    node.located = true
}
