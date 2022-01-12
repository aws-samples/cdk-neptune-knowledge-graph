const render = require("./render")
const webUtil = require("./web-util")
const viewNode = require("./node-view")
const viewEdge = require("./edge-view")
const focusOn = require("./focus-on")

/**
 * Get the position of the mouse within the canvas.
 * Coordinates are relative to base width and height.
 */
function getMousePos(evt) {
    const canvas = document.getElementById("canvas")
    const rect = canvas.getBoundingClientRect()
    const scale = 1 // ?
    return {
        x: (evt.clientX - rect.left) * scale,
        y: (evt.clientY - rect.top) * scale,
    }
}

/**
 * Make sure the graph is populated.
 * 
 * @param {*} graph 
 * @returns 
 */
function isGraphValid(graph) {
    return graph && graph.data && graph.data.nodes && graph.data.edges
}

/**
 * Handle mouse moves
 * 
 * @param {*} graph 
 * @param {*} poz 
 */
function move(graph, poz) {

    // console.info("move", poz)
    
    if (!isGraphValid(graph)) return

    const scale = graph.scale

    // Check to see if we are dragging the canvas itself
    if (graph.canvasDrag) {
        const xOffset = poz.x - graph.canvasDrag.start.x
        const yOffset = poz.y - graph.canvasDrag.start.y
        graph.offset.x = xOffset * scale + graph.canvasDrag.transform.e
        graph.offset.y = yOffset * scale + graph.canvasDrag.transform.f
        render(graph, false)
        return
    }

    // Check to see if we are dragging a node
    for (const node of graph.data.nodes) {
        if (node.down) {
            graph.canvas.style.cursor = "grab"
            node.x = poz.x - graph.offset.x / scale
            node.y = poz.y - graph.offset.y / scale
            render(graph, false)
            return // Don't continue to hover processing
        }
    }

    let changed = false

    // Check for mouse over nodes
    let hitId = null
    for (const node of graph.data.nodes) {
        if (webUtil.hitTest(graph, node.x, node.y, graph.NODE_RADIUS, poz.x, poz.y)) {
            if (!node.hover) changed = true
            node.hover = true
            hitId = node.id
            graph.canvas.style.cursor = "pointer"
        }
    }
    for (const node of graph.data.nodes) {
        if (node.id !== hitId) {
            if (node.hover) changed = true
            node.hover = false
        }
    }
    if (hitId) {
        if (changed) render(graph, false)
        return // Don't continue to hover edges that might be underneath
    }

    // Check for mouse over edges
    hitId = null
    for (const edge of graph.data.edges) {
        if (webUtil.hitTestEdge(graph, edge, poz.x, poz.y)) {
            if (!edge.hover) changed = true
            edge.hover = true
            hitId = edge.id
            graph.canvas.style.cursor = "pointer"
        }
    }
    for (const edge of graph.data.edges) {
        if (edge.id !== hitId) {
            if (edge.hover) changed = true
            edge.hover = false
        }
    }

    // TODO: For better performance, only render if something changed

    if (!hitId) {
        graph.canvas.style.cursor = "grab"
    }

    if (changed) {
        render(graph, false)
    }
}

/**
 * Handle mouse up events.
 * 
 * Select nodes and edges, view their details, and highlight them.
 * 
 * @param {*} graph 
 * @param {*} poz 
 */
async function up(graph, poz) {

    graph.canvasDrag = null
    
    if (!isGraphValid(graph)) return

    let selectedNodeId
    for (const node of graph.data.nodes) {
        if (webUtil.hitTest(graph, node.x, node.y, graph.NODE_RADIUS, poz.x, poz.y)) {
            await viewNode(graph, node)
            node.selected = true
            selectedNodeId = node.id
            break
        }
    }
    for (const node of graph.data.nodes) {
        if (node.id !== selectedNodeId) node.selected = false
        node.down = false
    }
    if (selectedNodeId) {
        render(graph, false)
        return // Don't continue to select edges that might be underneath
    }

    let selectedEdgeId
    for (const edge of graph.data.edges) {
        if (webUtil.hitTestEdge(graph, edge, poz.x, poz.y)) {
            await viewEdge(graph, edge)
            edge.selected = true
            selectedEdgeId = edge.id
            break
        }
    }
    for (const edge of graph.data.edges) {
        if (edge.id !== selectedEdgeId) edge.selected = false
    }

    render(graph, false)
}

/**
 * Handle mouse down events.
 * 
 * Drag nodes to new locations.
 * 
 * @param {*} graph 
 * @param {*} poz 
 */
function down(graph, poz) {

    console.info("down", poz)
    
    if (!isGraphValid(graph)) return

    // On mouse down, if we are on a node, mark it as down.
    // We will check this in move() to see if it's being dragged.
    let downNodeId
    for (const node of graph.data.nodes) {
        if (webUtil.hitTest(graph, node.x, node.y, graph.NODE_RADIUS, poz.x, poz.y)) {
            node.down = true
            downNodeId = node.id
            break
        }
    }
    for (const node of graph.data.nodes) {
        if (node.id !== downNodeId) node.down = false
    }

    let hitEdge
    for (const edge of graph.data.edges) {
        if (webUtil.hitTestEdge(graph, edge, poz.x, poz.y)) {
            hitEdge = edge
            break
        }
    }

    if (downNodeId || hitEdge) return

    // Start dragging the canvas
    const ctx = graph.canvas.getContext("2d")
    const transform = ctx.getTransform()
    graph.canvasDrag = {
        start: poz,
        transform,
    }
    console.log(`Start dragging at ${poz.x} ${poz.y}`)
}


/**
 * Handle double click events on the canvas.
 * 
 * If a node is double clicked, refresh the data to focus on that node.
 * 
 * @param {*} graph 
 * @param {*} poz 
 */
async function dblclick(graph, poz) {

    if (!isGraphValid(graph)) return

    let hit = false
    for (const node of graph.data.nodes) {
        if (webUtil.hitTest(graph, node.x, node.y, graph.NODE_RADIUS, poz.x, poz.y)) {
            await focusOn(graph, node)
            hit = true
            break
        }
    }

    if (!hit) {
        await focusOn(graph, null, false)
    }
}

module.exports = { getMousePos, up, down, move, dblclick }