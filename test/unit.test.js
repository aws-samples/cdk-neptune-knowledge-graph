const util = require("../web/js/web-util")
const complement = require("../web/js/complement")

test("hitTest", () => {

    const graph = {
        offset: { x: 0, y: 0 },
        scale: 1,
    }

    expect(util.hitTest(graph, 0, 0, 5, 1, 1)).toBeTruthy()
    expect(util.hitTest(graph, 0, 0, 5, 6, 6)).toBeFalsy()
    expect(util.hitTest(graph, 0, 0, 6, 4, 4)).toBeTruthy()
    expect(util.hitTest(graph, 564, 24, 160, 574, 256)).toBeFalsy()

})

test("complement", () => {

    const cyan = { r: 0, g: 0xff, b: 0xff }
    const red = { r: 0xff, g: 0, b: 0 }
    const c = complement(cyan)
    expect(c.r == red.r && c.g == red.g && c.b == red.b).toBeTruthy()

})

test("hexrgb", () => {
    let hex = "000000"
    let rgb = util.hexrgb(hex)
    expect(rgb.r == 0 && rgb.g == 0 && rgb.b == 0).toBeTruthy()
    expect(util.rgbhex(rgb)).toEqual(hex)

    hex = "#000000"
    rgb = util.hexrgb(hex)
    expect(rgb.r == 0 && rgb.g == 0 && rgb.b == 0).toBeTruthy()

    hex = "#32a852"
    rgb = util.hexrgb(hex)
    expect(rgb.r == 50 && rgb.g == 168 && rgb.b == 82).toBeTruthy()
    expect(util.rgbhex(rgb)).toEqual(hex.substring(1))

})

test("functions work like I think", () => {
    const o = {}
    o.f1 = function () { return "1" }
    o.f2 = function () { return "2" }

    let a = true
    const f = a ? o.f1 : o.f2
    expect(f()).toEqual("1")

    class C {
        constructor() {
            this.one = 1
            this.two = 2
        }
        f1() {
            return this.one
        }
        f2() {
            return this.two
        }
    }

    const c = new C()
    const cf = a ? c.f1 : C.f2

    expect(cf.call(c)).toEqual(1)
})
