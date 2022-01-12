const uuid = require("uuid")
const gremlin = require("neptune-gremlin")

/**
 * Test an assertion and log the results.
 * 
 * @param {*} msg 
 * @param {*} t 
 * @returns 
 */
function assert(msg, t) {
    if (!t) {
        console.error(`FAILED: ${msg}`)
        return false
    } else {
        console.log(`SUCCEEDED: ${msg}`)
        return true
    }
}

/**
 * Run a series of test assertions.
 * 
 * @param {*} assertions 
 * @returns 
 */
function runAssertions(assertions) {
    let allSucceeded = true
    for (const t in assertions) {
        let result = false
        try {
            result = assert(t, assertions[t]())
        } catch (e) {
            allSucceeded = false
            console.error(`EXCEPTION: ${t}: ${JSON.stringify(e)}`)
        }
        if (!result) allSucceeded = false
    }
    return allSucceeded
}

/**
 * Test the aws-neptune-gremlin lib
 * 
 * This has to be a Lambda function since it needs to be in the VPC with Neptune.
 * 
 * It is not included in the APIGW rest api
 * 
 * @param {*} event 
 * @param {*} context 
 */
exports.handler = async (event, context) => {
    console.log(event)
    console.log(context)

    const host = process.env.NEPTUNE_ENDPOINT
    const port = process.env.NEPTUNE_PORT
    const useIam = process.env.USE_IAM === "true"

    const connection = new gremlin.Connection(host, port, useIam)

    console.log(`About to connect to ${host}:${port} useIam:${useIam}`)

    await connection.connect()

    const id = uuid.v4()

    const node1 = {
        id,
        properties: {
            name: "Test Node",
            a: "A",
            b: "B",
        },
        labels: ["label1", "label2"],
    }

    await connection.saveNode(node1)

    const node2 = {
        id: uuid.v4(),
        properties: {
            name: "Test Node2",
        },
        labels: ["label1"],
    }

    await connection.saveNode(node2)

    const edge1 = {
        id: uuid.v4(),
        label: "points_to", 
        to: node2.id, 
        from: node1.id,
        properties: {
            "a": "b",
        },
    }

    await connection.saveEdge(edge1)

    let searchResult = await connection.search({})

    let found

    for (const node of searchResult.nodes) {
        if (node.id === id) {
            found = node
            break
        }
    }

    console.info("found", found)

    let assertions = {
        "Search": () => found !== undefined,
        "Name": () => found.properties.name === "Test Node",
        "A": () => found.properties.a === "A",
        "B": () => found.properties.b === "B",
        "Label0": () => found.labels[0] === "label1",
        "Label1": () => found.labels[1] === "label2",
    }

    const createOk = runAssertions(assertions)

    if (!createOk) {
        throw new Error("node assertions failed")
    }

    // Make sure the edge exists
    found = null

    for (const edge of searchResult.edges) {
        if (edge.id === edge1.id) {
            found = edge
            break
        }
    }

    console.info("found", found)

    const edgeOk = runAssertions({
        "Edge found": () => found != null,
        "Edge label": () => found.label === "points_to",
        "Edge properties": () => found.properties && found.properties.a === "b",
    })

    if (!edgeOk) throw new Error("edge assertions failed")

    // Make an edge in the other direction
    const edge2 = {
        id: uuid.v4(),
        label: "points_to", 
        properties: {},
        to: node1.id, 
        from: node2.id,
    }

    await connection.saveEdge(edge2)
    await connection.deleteEdge(edge2.id)

    // Delete the node
    await connection.deleteNode(id)

    // Make sure it was deleted, along with its edges
    searchResult = await connection.search({})

    const deletedOk = runAssertions({
        "Edges not found": () => {
            let foundEdge
            for (const edge of searchResult.edges) {
                if (edge.from === id || edge.to === id) {
                    foundEdge = edge
                    break
                }
            }
            return foundEdge === undefined
        },
        "Node not found": () => {
            let foundDeleted
            for (const node of searchResult.nodes) {
                if (node.id === id) {
                    foundDeleted = node
                    break
                }
            }
            return foundDeleted === undefined
        },
    })

    if (!deletedOk) {
        throw new Error("delete assertions failed")
    }

    return deletedOk
}