// require("regenerator-runtime/runtime")
import { TARGET_ENV } from "./config"
import render from "./render"
import { post } from "./rest-api"
import * as uuid from "uuid"
import { getMousePos, move, up, down, dblclick } from "./input"
import viewNode from "./node-view"
import { checkAuthCode, setCookie, getCookie, removeCookie } from "./auth"
import * as restApi from "./rest-api"
import { Grid } from "gridjs"
import { getFillStyle } from "./label-colors"
import "gridjs/dist/theme/mermaid.css"
import Mustache from "mustache"
import find from "./find"

/**
 * Initialize event handling.
 * 
 * @param {*} graph
 */
function initEvents(graph) {

    console.log("initEvents")

    const canvas = document.getElementById("canvas")

    window.addEventListener("resize", () => {
        render(graph, true)
    }, false)

    // Listen to mouse moves
    canvas.addEventListener("mousemove", (e) => {
        e.stopPropagation()
        e.preventDefault()
        move(graph, getMousePos(e))
    })

    // Listen to mouse ups
    canvas.addEventListener("mouseup", (e) => {
        e.stopPropagation()
        e.preventDefault()
        up(graph, getMousePos(e))
    })

    // Listen to mouse downs
    canvas.addEventListener("mousedown", (e) => {
        e.stopPropagation()
        e.preventDefault()
        down(graph, getMousePos(e))
    })

    // Listen to double clicks
    canvas.ondblclick = (e) => {
        e.stopPropagation()
        e.preventDefault()
        dblclick(graph, getMousePos(e))
    }

    // Create a new node
    document.getElementById("btn-new-node").onclick = async function () {
        const label = document.getElementById("txt-new-node-label")
        if (!label) return // TODO warning
        const name = document.getElementById("txt-new-node-name")
        const errorDiv = document.getElementById("new-node-error")
        errorDiv.innerHTML = ""

        const newNode = {
            id: uuid.v4(),
            properties: {
                name: name.value,
            },
            labels: [label.value],
        }

        try {
            await post("node-post", newNode, graph.partition)
            errorDiv.innerHTML = "Saved node"
        } catch (ex) {
            console.error(ex)
            errorDiv.innerHTML = "Failed to save node"
        }
        graph.data.nodes.unshift(newNode)
        label.value = ""
        name.value = ""
        viewNode(graph, newNode)
        render(graph, true)
    }

    // Find nodes by name when typing into the Find text box
    const txtFind = document.getElementById("txt-find")
    txtFind.onkeyup = async ({ key }) => {
        const t = txtFind.value
        await find(graph, key, t)
    }

    // Export and download the data
    document.getElementById("btn-export").onclick = async function () {
        const url = await restApi.get("export-url-get", null, graph.partition, true)
        document.getElementById("export-url").innerHTML = `<a href="${url}">Download</a>`
    }

    // Import data
    const btnImport = document.getElementById("btn-import")
    const importFile = document.getElementById("import-file")
    importFile.onchange = async function() {
        try {
            const file = this.files[0]
            const key = "import-" + file.name
            const partition = getCookie("partition")
            const encodedKey = encodeURIComponent(key)

            // Get a signed URL to allow us to put directly to the bucket
            const signedUrl = await restApi.get("import-url-get", encodedKey, null, true)

            // PUT the file to the bucket
            await fetch(signedUrl, {
                method: "PUT", 
                body: file,
                mode: "cors",
                cache: "no-cache",
                headers: {
                    "Content-Type": "application/json",
                },
            })

            // Import the data into Neptune
            await restApi.post("import-post", {key}, partition)

            // Refresh the graph
            await search(partition)

        } catch (ex) {
            console.error(ex)
        }
    }

    btnImport.onclick = () => {
        importFile.click()
    }



    // // Import from Neo4j
    // document.getElementById("btn-import").onclick = async function() {
    //     const data = JSON.parse(document.getElementById("txt-import").value)
    //     for (const item of data) {
    //         if (item.type === "node") {
    //             const node = {}
    //             node.id = item.id
    //             node.labels = [item.labels[0]]
    //             node.properties = item.properties || {}
    //             await restApi.post("node-post", node)
    //         }
    //         if (item.type === "relationship") {
    //             const edge = {}
    //             edge.id = item.id
    //             edge.label = item.label
    //             edge.from = item.start.id
    //             edge.to = item.end.id
    //             edge.properties = item.properties || {}
    //             await restApi.post("edge-post", edge)
    //         }
    //     }
    //     render(graph, true)
    // }

    document.getElementById("btn-grid").onclick = function () {
        viewGrid(graph)
    }
    document.getElementById("btn-canvas").onclick = function () {
        document.getElementById("grid-container").style.display = "none"
        document.getElementById("canvas-container").style.display = "block"
        render(graph, true)
    }
}

/**
 * View the graph data as a grid instead of the canvas.
 * 
 * @param {*} graph 
 */
function viewGrid(graph) {

    // console.log("viewGrid", graph.data.nodes.length)

    const gridContainer = document.getElementById("grid-container")
    gridContainer.innerHTML = ""

    const columns = [
        { name: "id", hidden: true },
        "name", "label", "title", "type",
    ]

    for (const node of graph.data.nodes) {
        for (const key in node.properties) {
            console.log("Checking key", key)
            const idx = columns.indexOf(key)
            if (idx === -1) {
                columns.push(key)
            }
        }
    }

    console.info("columns", columns)

    const data = []
    for (const node of graph.data.nodes) {
        const a = []
        for (const key of columns) {
            if (key === "label") {
                a.push(node.labels[0])
            } else if (key === "id") {
                a.push(node.id)
            } else {
                const val = node.properties[key]
                if (val) a.push(val)
                else a.push("")
            }
        }
        data.push(a)
    }

    new Grid({
        columns,
        data,
        sort: true,
        resizable: true,
    }).render(gridContainer)

    document.getElementById("canvas-container").style.display = "none"
    gridContainer.style.display = "block"
}


/**
 * Initialize an array of colors we'll use for labels.
 * Known labels will be filled in later.
 * 
 * @param {*} graph 
 */
function populateLabelColors(graph) {
    graph.labelColors = [
        "#6166B3", "#32C1CD", "#17D7A0",
        "#C85C5C", "#F9975D", "#FBD148", 
        "#B2EA70", "#8A8635", "#E9C891",
    ]
    graph.knownLabels = []
    graph.genericColor = "#666699"

    // Initialize colors so they stay constant.
    // Should we be using a hash? Want to stay consistent after restart.
    // TODO
    for (const node of graph.data.nodes) {
        getFillStyle(graph, node)
    }
}

/**
 * Configure constants
 * 
 * @param {*} graph 
 */
function initConstants(graph) {
    graph.NODE_RADIUS = 30
}

/**
 * Query the graph using the current search parameters.
 */
async function search(partition) {

    let searchResult
    try {
        searchResult = await post("search-post", {}, partition)
    } catch (ex) {
        console.error(ex)
        searchResult = {}
    }
    // console.log(JSON.stringify(searchResult))

    // const data = generateTestData()
    document.getElementById("canvas-container").style.display = "block"
    document.getElementById("grid-container").style.display = "none"
    document.getElementById("parts-container").style.display = "none"

    document.getElementById("current-partition").innerHTML = ": " + partition

    const canvas = document.getElementById("canvas")
    // const ctx = canvas.getContext("2d")
    // console.info("Starting transform", ctx.getTransform())

    const graph = {
        canvas,
        data: searchResult,
        offset: {
            x: 0,
            y: 0,
        },
        partition,
    }

    initConstants(graph)
    populateLabelColors(graph)
    initEvents(graph)
    render(graph, true)

}

let partsTemplate

/**
 * Initialize the page.
 */
async function init() {

    // Check to see if we're logged in
    const isCognitoRedirect = await checkAuthCode()
    if (isCognitoRedirect) return

    // Show what environment we're in
    document.getElementById("target-env").innerHTML = TARGET_ENV
    // console.log(APIGATEWAY_URL)

    // Wire up the title link to reload the page
    document.getElementById("graph-title-link").onclick = () => {
        // Clear the selected parition and reload
        removeCookie("partition")
        window.location = "/"
    }

    // See if we previously selected a partition
    const partition = getCookie("partition")
    if (partition) {
        await search(partition)
        return
    }

    // Go get a list of partitions
    try {

        // Get the template
        if (!partsTemplate) {
            partsTemplate = await (await fetch("/tmpl/partitions.html?r=" + Math.random())).text()
        }

        // Fetch the list of partitions
        const partitionResult = await post("search-post", { }, META_PARTITION)
        console.log(partitionResult)

        // Render the template to show the user the list of parts

        const view = {}
        view.parts = []

        for (const node of partitionResult.nodes) {
            if (node.labels[0] === "part") {
                view.parts.push(node.properties.name)
            }
        }

        const rendered = Mustache.render(partsTemplate, view)

        const partsContainer = document.getElementById("parts-container")
        partsContainer.innerHTML = rendered
        partsContainer.style.display = "block"

        if (view.parts.length === 0) {
            document.getElementById("no-parts").style.display = "block"
        } else {
            document.getElementById("parts").style.display = "block"

            // Wire up event handlers for the part buttons
            for (const partName of view.parts) {
                (function(p) {
                    const el = document.getElementById(`btn-${p}`)
                    el.onclick = async function() {
                        console.log("Selected partition", p)
                        setCookie("partition", p)
                        await search(p)
                    }
                }(partName))
            }
        }

        // Save the partition and reload
        document.getElementById("btn-create-part").onclick = async () => {
            const partName = document.getElementById("txt-part").value
            if (!partName) return
            await post("node-post", {
                id: uuid.v4(),
                labels: ["part"],
                properties: {
                    name: partName,
                },
            }, META_PARTITION)
            await search(partName)
        }

    } catch (ex) {
        console.error(ex)
    }
}

const META_PARTITION = "__meta"

init()