const path = require("path");

/** Creates the Karma config function based on the provided options
 *
 * @param {object} config Configuration options to override on/add to the base config.
 */
function createKarmaConfig(config) {
    return function(karmaConfig) {
        karmaConfig.set({
            basePath: path.resolve(__dirname, ".."),
            frameworks: ["jasmine"],
            files: [
                "wwwroot/lib/msgpack5/msgpack5.js",
                "wwwroot/lib/signalr/msgpack5.js",
                "node_modules/@aspnet/signalr/dist/browser/signalr.js",
                "node_modules/@aspnet/signalr-protocol-msgpack/dist/browser/signalr-protocol-msgpack.js",
                "wwwroot/dist/signalr-functional-tests.js"
            ],
            preprocessors: {
                "**/*.js": ["sourcemap"]
            },
            reporters: ["progress"],
            port: 9876,
            colors: true,
            logLevel: config.LOG_INFO,
            autoWatch: false,
            singleRun: false,
            concurrency: Infinity,

            // Log browser messages to a file, not the terminal.
            browserConsoleLogOptions: {
                level: "debug",
                path: "bin/console.log",
                terminal: false
            },

            // Override/add values using the passed-in config.
            ...config,
        });
    }
}

module.exports = createKarmaConfig;