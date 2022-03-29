import Mustache from "mustache"
import { post, del } from "./rest-api"
import { getFillStyle, hashColor } from "./label-colors"
import render from "./render"
import * as uuid from "uuid"

/**
 * Delete a node.
 * 
 * @param {*} graph 
 * @param {*} node 
 */
async function deleteNode(graph, node) {
    const deleteResult = await del("node-delete", node.id, graph.partition)
    console.log(deleteResult)

    // Remove the node from the graph

    // First remove the edges
    let indexToDelete = -1
    do {
        indexToDelete = -1
        for (let i = 0; i < graph.data.edges.length; i++) {
            let edge = graph.data.edges[i]
            if (edge.to === node.id || edge.from === node.id) {
                indexToDelete = i
                break
            }
        }
        if (indexToDelete > -1) {
            graph.data.edges.splice(indexToDelete, 1)
        }
    } while (indexToDelete > -1)

    // Remove the node
    indexToDelete = -1
    for (let i = 0; i < graph.data.nodes.length; i++) {
        let nodeToDelete = graph.data.nodes[i]
        if (nodeToDelete.id === node.id) {
            indexToDelete = i
            break
        }
    }
    if (indexToDelete > -1) {
        graph.data.nodes.splice(indexToDelete, 1)
    }

    // // Re-render the canvas
    // render(graph)

    // // Reset the property view to blank
    // viewNode(graph, null)

    // An odd bug here where all the nodes get rendered on top of each other
    // Just start over... feels like cheating but it's reliable
    window.location = "/"
}

let nodeViewTemplate

/**
 * View node details in the left bar.
 * 
 * @param {*} node 
 */
async function viewNode(graph, node) {
    
    // Clear the current info
    document.getElementById("props").innerHTML = ""
    document.getElementById("props").style.display = "block"

    if (!node) {
        return
    }

    // Get the template
    if (!nodeViewTemplate) {
        nodeViewTemplate = await (await fetch("/tmpl/node-view.html?r=" + Math.random())).text()
    }
    
    const view = Object.assign({}, node)

    // Put the properties into an array of key value pairs for the template
    if (view.properties && !view.kv) {
        view.kv = []
        for (const p in node.properties) {
            if (p === "_partition") continue // Don't display partition strategy property
            view.kv.push({
                key: p,
                value: node.properties[p],
            })
            if (p === "name") {
                view.header = node.properties[p]
                // console.log("view.header is ", view.header)
            }
        }
    }
    view.labels = []
    let nodeLabels = node.labels
    if (!Array.isArray(nodeLabels)) {
        nodeLabels = [node.labels]
    }
    for (const ll of nodeLabels) {
        view.labels.push({
            label: ll, color: function color() {
                return getFillStyle(graph, {node: {labels:[ll]}})
            },
        })
    }
    view.nodestr = JSON.stringify(node, null, 4)

    const rendered = Mustache.render(nodeViewTemplate, view)

    document.getElementById("props").innerHTML = rendered

    for (const ll of nodeLabels) {
        const el = document.getElementById(`node-label-${ll}`)
        el.style.backgroundColor = getFillStyle(graph, {node: {labels:[ll]}})
    }

    // Set up an event handler for deleting properties
    for (const keyval of view.kv) {
        (function (k) {
            const el = document.getElementById(`prop-x-${keyval.key}`)
            el.addEventListener("click", async function () {
                console.log(`About to delete ${k}`)
                delete node.properties[k]
                const nodeResult = await post("node-post", node, graph.partition)
                console.log(nodeResult)
                viewNode(graph, node)
            })
        }(keyval.key))
    }

    // Set up an event handler for adding properties
    const addButton = document.getElementById("btn-add-prop")
    addButton.addEventListener("click", async function () {
        const txtKey = document.getElementById("txt-prop-name")
        const txtVal = document.getElementById("txt-prop-value")
        node.properties[txtKey.value] = txtVal.value
        const nodeResult = await post("node-post", node, graph.partition)
        console.log(nodeResult)
        viewNode(graph, node)
    })

    // Set up an event handler to delete a node
    const deleteButton = document.getElementById("btn-delete-node")
    deleteButton.addEventListener("click", async () => { deleteNode(graph, node) })

    // Event handlers for the edge labels to populate the text field
    const allLabels = document.getElementById("all-labels")
    const edgeLabels = allLabels.querySelectorAll(".edge-label")
    for (const el of edgeLabels) {
        el.style.backgroundColor = hashColor(el.innerHTML)
        el.onclick = function () {
            document.getElementById("txt-edge-label").value = el.innerHTML
        }
    }

    // Remember the last selected node so we can add edges
    if (graph.lastSelectedNode && graph.lastSelectedNode !== node) {
        document.getElementById("add-edge").style.display = "block"
        document.getElementById("add-edge-hide").style.display = "none"
        const last = graph.lastSelectedNode
        document.getElementById("node-edge-from").innerHTML = last.properties.name
        document.getElementById("node-edge-to").innerHTML = node.properties.name
        const label = document.getElementById("txt-edge-label")

        // Show the label in the text over the button
        label.onkeyup = function() {
            document.getElementById("node-edge-label").innerHTML = label.value
        }

        const edgeBtn = document.getElementById("btn-node-edge-from")

        // Show the edge arrow as a preview on the canvas
        edgeBtn.onmouseover = async function () {
            console.log("Previewing edge arrow TODO")
        }

        // Add the edge
        edgeBtn.onclick = async function () {
            if (!label || !label.value) return // TODO warn
            // TODO make sure the edge doesn't already exist

            const newEdge = {
                id: uuid.v4(),
                label: label.value,
                from: last.id,
                to: node.id,
                properties: {},
            }

            try {
                await post("edge-post", newEdge, graph.partition)
                graph.data.edges.push(newEdge)
                render(graph)
                // TODO - hide the modal
            } catch (ex) {
                console.error(ex)
                alert("Failed to save edge: " + ex)
            }
        }
    } else {
        document.getElementById("add-edge-hide").style.display = "block"
        document.getElementById("add-edge").style.display = "none"
    }
    graph.lastSelectedNode = node
}


export default viewNode
