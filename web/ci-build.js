// We need to build separately for all 3 targets environments,
// so that the S3 deployment includes the correct config.

// This should only be run on a CI/CD server! Don't run it locally.

const fs = require("fs-extra")
const Parcel = require("@parcel/core")

fs.ensureDirSync("dist")
fs.ensureDirSync("dist/beta")
fs.ensureDirSync("dist/gamma")
fs.ensureDirSync("dist/prod")

const entryFiles = ["index.html", "error.html", "tmpl/*.html"]

async function bundle (targetEnv) {
    // Copy the correct config file into the js folder
    fs.copySync(`js/${targetEnv}-config.js`, "js/config.js")

    const config = {
        outDir: `dist/${targetEnv}`,
        minify: true,
        watch: false,
    }

    // Initializes a bundler using the entrypoint location and options provided
    const bundler = new Parcel(entryFiles, config)

    // Run the bundler, this returns the main bundle
    // Use the events if you're using watch mode as this
    // promise will only trigger once and not for every rebuild
    await bundler.bundle()
}

(async function main () {
    await bundle("beta")
    await bundle("gamma")
    await bundle("prod")
})()
