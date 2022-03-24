import locateNode from "./locate"
import * as util from "./web-util"
import { getFillStyle } from "./label-colors"

/**
 * Draw a node that has already been located.
 * 
 * @param {*} graph 
 * @param {*} node 
 */
function drawNode(graph, node) {
    const x = node.x
    const y = node.y
    // console.log(`About to draw node ${node.id} at ${x}, ${y}`)

    const ctx = graph.canvas.getContext("2d")
    const radius = graph.NODE_RADIUS
    ctx.beginPath()
    ctx.fillStyle = getFillStyle(graph, node)
    ctx.strokeStyle = util.inverthex(ctx.fillStyle)
    let actualRadius = radius
    if (node.hover || node.selected) {
        ctx.lineWidth = 5
        actualRadius = actualRadius + 5
    } else {
        ctx.lineWidth = 2
    }
    ctx.arc(x, y, actualRadius, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.fill()
    //const textColor = "#" + util.rgbhex(complement(util.hexrgb(ctx.fillStyle)))
    // const textColor = util.inverthex(ctx.fillStyle)
    const textColor = util.getTextColor(ctx.fillStyle)
    // console.log(`${ctx.fillStyle} -> ${textColor}`)
    ctx.strokeStyle = textColor
    ctx.fillStyle = textColor
    ctx.lineWidth = 1
    ctx.font = "normal 9pt Arial"
    if (node.selected) {
        ctx.font = "bold 9pt Arial"
    }
    ctx.textAlign = "center"
    ctx.fillText(node.properties.name, x, y + 5)

}

/**
 * Draw all nodes onto the canvas
 * 
 * @param {Canvas} canvas 
 * @param {Map} nodes 
 */
function locateNodes(graph, nodes) {

    // console.info("locateNodes", nodes)

    for (const node of nodes) {
    // nodes.forEach((node) => {

        if (!node) {
            // This shouldn't happen but it's possible if the map 
            // was populated with an empty node object, which means the 
            // data is probably corrupted with edges that point to deleted nodes (maybe?)
            console.log("locateNode node is undefined")
            continue
        }

        // Don't locate nodes that were already located
        if (node.located) {
            // console.log(`node ${node.id} was already located`)
            continue
        }

        // Locate this node
        locateNode(graph, node)

        // Iterate over edges that point to this from other nodes
        //const edgeNodes = new Map()
        const edgeNodes = []
        for (const fromId of node.from) {
            const fromNode = graph.nodes.get(fromId)
            if (!fromNode) {
                // console.log(`Missing from node ${fromId}`)
                continue
            }
            edgeNodes.push(fromNode)
        }

        // Recurse
        if (edgeNodes.size > 0) locateNodes(graph, edgeNodes)
    }
}

/**
 * Calculate the angle in radians between the centers of from and to
 * 
 * @param {*} from 
 * @param {*} to 
 * @returns 
 */
function angleBetweenNodes(from, to) {
    const dx = from.x - to.x
    const dy = from.y - to.y

    const angle = Math.atan2(dx, dy)

    // const adjacent = (Math.abs(dx) < Math.abs(dy)) ? dx : dy
    // const opposite = (adjacent == dx) ? dy : dx
    // const tanx = opposite / adjacent
    // console.log(`adjacent ${adjacent} opposite ${opposite} tanx ${tanx}`)
    // const angle = Math.atan(tanx)

    // console.log(`Angle between ${from.id} and ${to.id}: ${angle}r ${angle * (180 / Math.PI)}d`)
    return angle
}

/**
 * Draw the arrow ending a line, assuming the origin is 0, 0
 * 
 * The context should be translated before calling this function
 * 
 * @param {*} ctx 
 */
function drawArrow(ctx) {
    const arrowAdjacentLen = 10
    const arrowOppositeLen = 5

    ctx.beginPath()
    ctx.lineTo(0, arrowAdjacentLen)
    ctx.lineTo(-arrowOppositeLen, arrowAdjacentLen)
    ctx.lineTo(arrowOppositeLen, arrowAdjacentLen)
    ctx.lineTo(0, 0)
    ctx.lineTo(-arrowOppositeLen, arrowAdjacentLen)
    ctx.stroke()
    ctx.fill()
}

/**
 * Style the edge arrow and label depending on if we're hovering.
 * 
 * @param {*} ctx 
 * @param {*} edge 
 */
function setEdgeStyle(ctx, edge) {
    if (edge.hover) {
        ctx.strokeStyle = "black"
        ctx.fillStyle = "black"
        ctx.font = "bold 10pt Arial"
    } else {
        ctx.strokeStyle = "gray"
        ctx.fillStyle = "gray"
        ctx.font = "normal 10pt Arial"
    }
}

/**
 * Draw a line to connect nodes, and draw the edge's label
 * 
 * @param {*} graph 
 * @param {*} edge 
 */
function drawEdge(graph, edge) {
    const from = graph.nodes.get(edge.from)
    const to = graph.nodes.get(edge.to)
    const ctx = graph.canvas.getContext("2d")

    setEdgeStyle(ctx, edge)

    // Do some math to connect the two circles from outside to outside

    // Get the angle from center to center
    const angle = angleBetweenNodes(from, to)

    // Get the opposite and adjacent lengths of the side of a triangle in the circle
    const o = Math.abs(graph.NODE_RADIUS * Math.sin(angle))
    const a = Math.abs(graph.NODE_RADIUS * Math.cos(angle))

    // console.log(`o: ${o}, a: ${a}`)

    // Draw the connecting line by subtracting the line segments inside the circles
    ctx.beginPath()

    let dx = 1
    if (from.x > to.x) dx = -1
    const startx = from.x + (o * dx)
    const endx = to.x - (o * dx)

    let dy = 1
    if (from.y > to.y) dy = -1
    const starty = from.y + (a * dy)
    const endy = to.y - (a * dy)

    ctx.moveTo(startx, starty)
    ctx.lineTo(endx, endy)
    ctx.stroke()

    // Record the start and end of the arrow for hit testing
    edge.startx = startx
    edge.starty = starty
    edge.endx = endx
    edge.endy = endy

    // Draw the arrow head
    ctx.save()
    ctx.translate(endx, endy)
    // console.log("angle", angle)
    ctx.rotate(-angle)
    drawArrow(ctx)
    ctx.restore()

    // Locate the center of the edge label
    const leftx = (from.x > to.x) ? to.x : from.x
    const topy = (from.y > to.y) ? to.y : from.y
    edge.x = leftx + Math.abs(to.x - from.x) / 2
    edge.y = topy + Math.abs(to.y - from.y) / 2

    // Draw a white circle to hide part of the arrow
    ctx.beginPath()
    ctx.arc(edge.x, edge.y, 12, 0, 2 * Math.PI)
    ctx.strokeStyle = "white"
    ctx.fillStyle = "white"
    ctx.stroke()
    ctx.fill()
    
    // Draw the edge label
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    setEdgeStyle(ctx, edge)
    ctx.fillText(edge.label, edge.x, edge.y)
    edge.located = true
}

/**
 * Draw the nodes after they have been located.
 * 
 * @param {*} graph 
 * @param {Array} nodes 
 */
function drawNodes(graph, nodes) {
    for (const node of nodes) {
        drawNode(graph, node)
    }
}

/**
 * Draw the edges, after the nodes have been located.
 * 
 * @param {*} graph 
 * @param {Array} edges 
 */
function drawEdges(graph, edges) {
    for (const edge of edges) {
        drawEdge(graph, edge)
    }
}

/**
 * Map the relationships between nodes and edges.
 * 
 * @param {*} graph 
 */
function mapNodes(graph) {
    const nodes = new Map()
    for (const node of graph.data.nodes) {
        nodes.set(node.id, node)
        node.from = []
        node.to = []
    }
    for (const edge of graph.data.edges) {
        const from = nodes.get(edge.from)
        const to = nodes.get(edge.to)
        from.to.push(to.id)
        to.from.push(from.id)
    }
    graph.nodes = nodes
}

/**
 * Initialize and clear the canvas before rendering nodes and edges.
 * 
 * @param {*} canvas 
 * @param {*} graph 
 */
function initCanvas(canvas, graph) {

    canvas.style.width = "100%"
    canvas.style.height = "100%"
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight
    canvas.width = w
    canvas.height = h
    graph.width = w
    graph.height = h

    // console.log(`${canvas.width}w ${canvas.height}h`)

    // Style also needs to be adjusted to avoid blurriness
    canvas.style.width = canvas.width + "px"
    canvas.style.height = canvas.height + "px"

    const ctx = canvas.getContext("2d")
    const scale = window.devicePixelRatio
    
    // console.info("scale", scale)
   
    canvas.width = w * scale
    canvas.height = h * scale

    // Normalize coordinate system to use css pixels.
    ctx.scale(scale, scale)

    ctx.clearRect(0, 0, w, h)

    graph.scale = scale

    // Translate the canvas after it has been dragged
    ctx.setTransform(graph.scale, 0, 0, graph.scale, graph.offset.x, graph.offset.y)
}

/**
 * Clear all location information from nodes and edges.
 * 
 * @param {*} graph 
 */
function initNodeLocations(graph) {
    for (const node of graph.data.nodes) {
        node.located = false
        node.x = undefined
        node.y = undefined
    }
    for (const edge of graph.data.edges) {
        edge.x = undefined
        edge.y = undefined
        edge.startx = undefined
        edge.starty = undefined
        edge.endx = undefined
        edge.endy = undefined
    }
}

/**
 * Render the graph to the canvas
 * 
 * This is called each time the screen is resized or we respond to an event.
 * 
 * @param {*} data 
 * @param {*} canvas 
 * @returns 
 */
export default function render(graph, relocateNodes = true) {

    // console.log("render relocateNodes", relocateNodes)
    // console.log("render offset", graph.offset)

    const canvas = graph.canvas

    if (!graph.data.nodes || !graph.data.edges) {
        console.error("Graph data must have nodes and edges")
        return
    }

    // Reset the drawing area
    initCanvas(canvas, graph)

    // Create a map of relationships for quick iteration
    mapNodes(graph)

    // Figure out where the nodes and edges should be located.
    // If we're dragging things around we don't do this.
    if (relocateNodes) {
        initNodeLocations(graph)
        locateNodes(graph, graph.data.nodes)
    }

    drawEdges(graph, graph.data.edges)
    drawNodes(graph, graph.data.nodes)

    // drawSpiral(graph.canvas.getContext("2d"))

}
