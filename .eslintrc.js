module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es2021": true,
        "jest": true,
        "node": true,
    },
    "extends": ["eslint:recommended","plugin:promise/recommended"],
    "plugins": ["promise"],
    "parserOptions": {
        "ecmaVersion": 12,
        "sourceType": "module",
    },
    "rules": {
        "indent": [
            "error",
            4,
            { "SwitchCase": 1 },
        ],
        "linebreak-style": [
            "error",
            "unix",
        ],
        "quotes": [
            "error",
            "double",
        ],
        "semi": [
            "error",
            "never",
        ],
        "no-new": ["off"],
        "comma-dangle": ["error", "always-multiline"],
        "padded-blocks": ["off"],
    },
    ignorePatterns: [
        "node_modules/",
        "cdk.out/",
        "vendor/",
        "build/",
        "dist/",
        "plugins.js",
    ],
}
