// vite.config.js
const { resolve } = require("path")
const { defineConfig } = require("vite")

module.exports = defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                edgeview: resolve(__dirname, "tmpl/edge-view.html"),
                nodeview: resolve(__dirname, "tmpl/node-view.html"),
                partitions: resolve(__dirname, "tmpl/partitions.html"),
            },
        },
        outDir: "dist/dev",
    },
})
