
/**
 * Get url parameters.
 */
function getParameterByName(name, url) {
    if (!url) url = window.location.href
    // name = name.replace(/[\[\]]/g, '\\$&')
    // eslint warning.. ?
    name = name.replace(/[[]]/g, "\\$&")
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)")
    const results = regex.exec(url)
    if (!results) return null
    if (!results[2]) return ""
    return decodeURIComponent(results[2].replace(/\+/g, " "))
}

/**
 * Check to see if the point x2, y2 is within the circle centered 
 * at x1, y1.
 * @param {*} x1 
 * @param {*} y1 
 * @param {*} radius 
 * @param {*} x2 
 * @param {*} y2 
 */
function hitTest(graph, x1, y1, radius, x2, y2) {
    x1 += graph.offset.x / graph.scale
    y1 += graph.offset.y / graph.scale
    const xd = Math.abs(x2 - x1)
    const yd = Math.abs(y2 - y1)
    const h2 = (xd * xd) + (yd * yd)
    const hd = Math.sqrt(h2)
    const hit = radius >= hd
    // console.log(`x1:${x1} y1:${y1} radius:${radius} x2:${x2} y2:${y2} hit:${hit}`)
    return hit
}

/**
 * Check to see if the point at x2, y2 is over an edge.
 */
function hitTestEdge(graph, edge, x2, y2, offset) {
    // How fancy do we want to get here?
    // We have edge.x, y, startx, starty, endx, endy

    // Just look for a small circle around the center for now...
    return hitTest(graph, edge.x, edge.y, 10, x2, y2, offset)
}

/**
 * Convert a hex color to rgb
 * 
 * @param {*} hex 
 * @returns 
 */
function hexrgb(hex) {
    if (hex.startsWith("#")) {
        hex = hex.substring(1)
    }
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    const rgb = { r, g, b }
    console.log(`${hex} = ${JSON.stringify(rgb)}`)
    return rgb
}

/**
 * Convert an rgb color to hex
 * 
 * @param {*} r 
 * @param {*} g 
 * @param {*} b 
 * @returns 
 */
const rgbhex = (rgb) => {
    var hex = (rgb.r << 16) | (rgb.g << 8) | rgb.b
    return hex.toString(16).padStart(6, 0)
}

/**
 * Invert a color
 * 
 * @param {*} hexTripletColor 
 * @returns 
 */
function inverthex(hex) {
    var color = hex
    if (color.startsWith("#")) {
        color = color.substring(1)
    }
    color = parseInt(color, 16)
    color = 0xFFFFFF ^ color
    color = color.toString(16)
    color = ("000000" + color).slice(-6)
    color = "#" + color
    return color
}

/**
 * Returns a light or black color depending on luminance.
 * https://stackoverflow.com/questions/3942878
 * 
 * @param {*} bgColor 
 * @param {*} lightColor 
 * @param {*} darkColor 
 * @returns 
 */
function getTextColor(bgColor, lightColor = "#FFFFFF", darkColor = "#000000") {

    const getLuminance = function (hexColor) {
        var color = (hexColor.charAt(0) === "#") ? hexColor.substring(1, 7) : hexColor
        var r = parseInt(color.substring(0, 2), 16) // hexToR
        var g = parseInt(color.substring(2, 4), 16) // hexToG
        var b = parseInt(color.substring(4, 6), 16) // hexToB
        var uicolors = [r / 255, g / 255, b / 255]
        var c = uicolors.map(col => col <= 0.03928 ? col / 12.92 : ((col + 0.055) / 1.055) ** 2.4)

        return (0.2126 * c[0]) + (0.7152 * c[1]) + (0.0722 * c[2])
    }

    var L = getLuminance(bgColor)
    var L1 = getLuminance(lightColor)
    var L2 = getLuminance(darkColor)

    return (L > Math.sqrt((L1 + 0.05) * (L2 + 0.05)) - 0.05) ? darkColor : lightColor
}

export { hitTest, hitTestEdge, hexrgb, 
    rgbhex, inverthex, getTextColor, getParameterByName }