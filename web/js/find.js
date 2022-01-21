import { focusOn, focusOnMultiple } from "./focus-on"
import render from "./render"

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
 * Select the node, center it, and view details.
 */
function highlightNode(graph, node) {

    console.log(`highlightNode ${node.properties.name}`)

    // Highlight the node
    node.selected = true

    // Show the side panel with node info
    // This is an issue when many nodes match the entered text
    // await viewNode(graph, node)

    // Center the view on the found node
    moveToFront(graph.data.nodes, node)
    
    // Re-render the graph
    render(graph, true)
}

/**
 * Debounce a function (wait for more input)
 */
function debounce(f, t = 500) {
    let timer
    return (...args) => {
        clearTimeout(timer)
        timer = setTimeout(() => { 
            f.apply(this, args) 
        }, t)
    }
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

    if (name.length === 1) {
        return
    }

    for (const node of graph.data.nodes) {
        node.selected = false
    }

    for (const node of graph.data.nodes) {
        const nodeval = node.properties["name"]
        if (!nodeval) {
            node.selected = false
            continue
        }

        // Look for nodes that start with the entered text
        if (nodeval.toLowerCase().startsWith(name.toLowerCase())) {

            // Delay slightly here so we don't highlight everything as 
            // the user types something in quickly
            debounceHighlight(graph, node)

            if (keyPressed === "Enter") {
                // Re-query neptune and return only that node so that we 
                // see a simplified, filtered view.
                // Should we do this all client side? Why re-query?
                // Might be better for when the graph is so big we have to filter.
                await focusOn(graph, node.labels[0], "name", node.properties.name)
                return
            }
        } else {
            node.selected = false
        }
    }
}

// Set up the debounce function so we don't search repeatedly as the user types
const debounceHighlight = debounce((g, n) => { highlightNode(g, n) })

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
    const tokens = txt.split("and")
    for (const token of tokens) {
        const term = {}
        if (token.indexOf(":") > -1) {
            const keyval = token.split(":")
            if (keyval[0] === "label") {
                term.label = keyval[1].trim()
            } else {
                term.key = keyval[0].trim()
                term.value = keyval[1].trim()
            }
            if (!term.label && !term.value) {
                // User has just typed "something:"
                return
            }
        } else {
            // Assume we are searching by name
            term.key = "name"
            term.value = token.trim()
        }
        terms.push(term)
    }

    // If we have one simple term searching by name, find that node
    if (terms.length === 1 && terms[0].key === "name" && terms[0].value) {
        await findOneByName(graph, terms[0].value, keyPressed)
        return
    }

    // Search for multiple nodes

    console.info("Searching for multiple: ", terms)

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
                    term.label = node.labels[0] // Preserve original case
                } 
            } else {
                if (node.properties[term.key]?.toLowerCase() === term.value.toLowerCase()) {
                    node.selected = true
                    term.value = node.properties[term.key] // Preserve case
                    lastLabel = node.labels[0] // Last label wins... ?
                    term.label = node.labels[0] // Preserve original case
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

        // If lastLabel is ? and the term doesn't have a label, we didn't see it 
        // in the currently rendered graph, and a neptune query won't return anything

        for (const term of terms) {
            if (term.label === undefined) term.label = lastLabel
        }

        console.info("terms", terms)

        focusOnMultiple(graph, terms)

    }

}
