import { post } from "./rest-api"
import render from "./render"

/**
 * Query the database and focus on a single node or reset to view everything.
 * 
 * @param {*} graph 
 * @param {*} label - The label to focus on, e.g. "Person"
 * @param {*} key - The property key, e.g. "name"
 * @param {*} value - The property value, e.g. "John Smith"
 * @param {*} focus - If false, re-query the entire graph to reset the view 
 */
export async function focusOn(graph, label, key, value, focus = true) {
    let searchResult
    try {
        const options = {}
        if (focus) {
            options.focus = {
                label,
                key,
                value,
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

/**
 * Focus on multiple search terms.
 * 
 * @param {*} graph 
 * @param {*} terms 
 */
export async function focusOnMultiple(graph, terms) {

    const results = []

    // Do separate queries to Neptune for each term and combine them

    for (const term of terms) {

        if (!term.label || !term.key || !term.value) {
            console.error("term must have key, value, and label")
            continue
        }
        let searchResult
        try {
            const options = {}
            if (focus) {
                options.focus = {
                    label: term.label,
                    key: term.key,
                    value: term.value,
                }
            }
            searchResult = await post("search-post", options, graph.partition)
            results.push(searchResult)
        } catch (ex) {
            console.error(ex)
            searchResult = {}
        }
    }

    const combined = {
        nodes: [],
        edges: [],
    }
    const nodeIds = {}
    const edgeIds = {}

    for (const searchResult of results) {
        for (const node of searchResult.nodes) {
            if (node.id in nodeIds) continue
            nodeIds[node.id] = true
            combined.nodes.push(node)
        }
        for (const edge of searchResult.edges) {
            if (edge.id in edgeIds) continue
            edgeIds[edge.id] = true
            combined.edges.push(edge)
        }
    }

    graph.data = combined
    graph.offset = {
        x: 0,
        y: 0,
    }
    render(graph, true)
}