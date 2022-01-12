const files = {
    "edge-delete": "./edge-delete.js", 
    "edge-post": "./edge-post.js", 
    "export-url-get": "./export-url-get.js",
    "integration-test": "./integration-test.js",
    "jwt-get": "./jwt-get.js",
    "node-delete": "./node-delete.js",
    "node-post": "./node-post.js",
    "search-post": "./search-post.js",
    "import-url-get": "./import-url-get.js",
    "import-post": "./import-post.js",
}

module.exports = {
    entry: files,
    externals: ["bufferutil", "utf-8-validate"],
    output: {
        path: __dirname + "/dist",
        filename: "[name].js",
        libraryTarget: "commonjs2",
    },
    target: "node",
    module: {
        rules: [],
    },
    mode: "production",
}