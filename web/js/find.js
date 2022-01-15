import { focusOn, focusOnMultiple } from "./focus-on"
import render from "./render"
import viewNode from "./node-view"

/**
 * Move a node to the front of the array so that it renders first
 * 
 * @param {*} nodes 
 * @param {*} node 
 */
function moveToFront(nodes, node) {
    let idx = 0
    for (const n of nodes) {
        if (n.id === node.id) {
            break
        }
        idx++
    }
    nodes.splice(idx, 1)
    nodes.unshift(node)
}

/**
 * Find a single node by name
 * 
 * @param {*} graph 
 * @param {*} name 
 * @returns 
 */
async function findOneByName(graph, name, keyPressed) {

    if (!graph || !name) {
        console.error("findByName requires graph and name")
        return
    }

    for (const node of graph.data.nodes) {
        const nodeval = node.properties["name"]
        if (!nodeval) {
            node.selected = false
            continue
        }
        if (nodeval.toLowerCase() === name.toLowerCase()) {

            // Highlight the node
            node.selected = true

            // Show the side panel with node info
            viewNode(graph, node)

            // Center the view on the found node
            moveToFront(graph.data.nodes, node)
            render(graph, true)

            if (keyPressed === "Enter") {
                // Re-query neptune and return only that node so that we 
                // see a simplified, filtered view.
                // Should we do this all client side? Why re-query?
                // Might be better for when the graph is so big we have to filter.
                await focusOn(graph, node.labels[0], "name", name)
            }
        } else {
            node.selected = false
        }
    }
}

/**
 * Handle text being entered in the search bar.
 * 
 * @param {*} graph 
 * @param {*} key 
 * @param {*} txt 
 */
export default async function find(graph, keyPressed, txt) {

    // Reload the entire graph if the field is empty
    if (keyPressed === "Enter" && txt === "") {
        await focusOn(graph, null, null, null, false)
        return
    }

    // Break the text down into search terms
    //
    // Assume a term is searching by name
    // 
    // "Eric" means search for a node with name=Eric
    // "title:PSA" means search for all nodes with title=PSA
    const terms = []
    const tokens = txt.split(" ")
    for (const token of tokens) {
        if (token === "and") continue
        const term = {}
        if (token.indexOf(":") > -1) {
            const keyval = token.split(":")
            if (keyval[0] === "label") {
                term.label = keyval[1]
            } else {
                term.key = keyval[0]
                term.value = keyval[1]
            }
            if (!term.label && !term.value) {
                // User has just typed "something:"
                return
            }
        } else {
            // Assume we are searching by name
            term.key = "name"
            term.value = token
        }
        terms.push(term)
    }

    if (terms.length === 1 && terms[0].key === "name" && terms[0].value) {
        await findOneByName(graph, terms[0].value, keyPressed)
        return
    }

    // Search for multiple nodes

    // Unselect all nodes
    for (const node of graph.data.nodes) {
        node.selected = false
    }

    // Select the nodes that match the terms
    let lastLabel = "?"
    for (const node of graph.data.nodes) {
        for (const term of terms) {
            if (term.label) {
                if (node.labels[0]?.toLowerCase() === term.label.toLowerCase()) {
                    node.selected = true
                } 
            } else {
                if (node.properties[term.key]?.toLowerCase() === term.value.toLowerCase()) {
                    node.selected = true
                    lastLabel = node.labels[0] // Last label wins... ?
                } 
            }
        }  
    }

    await render(graph, false)

    if (keyPressed === "Enter") {

        // Re-query Neptune with the search terms to return a graph with just those nodes

        // Should we change neptune-gremlin to be able to handle this, or just do 
        // multiple fetches and merge the data client side?

        console.log({lastLabel})
        for (const term of terms) {
            if (term.label === undefined) term.label = lastLabel
        }

        console.info("terms", terms)

        focusOnMultiple(graph, terms)

    }

}