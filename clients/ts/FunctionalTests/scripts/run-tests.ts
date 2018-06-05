import { ChildProcess, spawn } from "child_process";
import { EOL } from "os";
import { Readable } from "stream";

import * as karma from "karma";
import * as path from "path";

import * as _debug from "debug";
const debug = _debug("signalr-functional-tests:run");

process.on("unhandledRejection", (reason) => {
    console.error(`Unhandled promise rejection: ${reason}`);
    process.exit(1);
});

// Don't let us hang the build. If this process takes more than 10 minutes, we're outta here
setTimeout(() => {
    console.error("Bail out! Tests took more than 10 minutes to run. Aborting.");
    process.exit(1);
}, 1000 * 60 * 10);

function waitForMatch(command: string, process: ChildProcess, regex: RegExp): Promise<RegExpMatchArray> {
    return new Promise<RegExpMatchArray>((resolve, reject) => {
        const commandDebug = _debug(`signalr-functional-tests:${command}`);
        try {
            let lastLine = "";

            async function onData(this: Readable, chunk: string | Buffer): Promise<void> {
                try {
                    chunk = chunk.toString();

                    // Process lines
                    let lineEnd = chunk.indexOf(EOL);
                    while (lineEnd >= 0) {
                        const chunkLine = lastLine + chunk.substring(0, lineEnd);
                        lastLine = "";

                        chunk = chunk.substring(lineEnd + EOL.length);

                        const results = regex.exec(chunkLine);
                        commandDebug(chunkLine);
                        if (results && results.length > 0) {
                            resolve(results);
                            return;
                        }
                        lineEnd = chunk.indexOf(EOL);
                    }
                    lastLine = chunk.toString();
                } catch (e) {
                    this.removeAllListeners("data");
                    reject(e);
                }
            }

            process.on("close", async (code, signal) => {
                console.log(`${command} process exited with code: ${code}`);
                global.process.exit(1);
            });

            process.stdout.on("data", onData.bind(process.stdout));
            process.stderr.on("data", (chunk) => {
                onData.bind(process.stderr)(chunk);
                console.error(`${command} | ${chunk.toString()}`);
            });
        } catch (e) {
            reject(e);
        }
    });
}

let configuration = "Debug";
let spec: string;
let sauce: boolean;

for (let i = 2; i < process.argv.length; i += 1) {
    switch (process.argv[i]) {
        case "--configuration":
            i += 1;
            configuration = process.argv[i];
            break;
        case "-v":
        case "--verbose":
            _debug.enable("signalr-functional-tests:*");
            break;
        case "--spec":
            i += 1;
            spec = process.argv[i];
            break;
        case "--sauce":
            sauce = true;
            console.log("Running on SauceLabs.");
            break;
    }
}

const configFile = sauce ?
    path.resolve(__dirname, "karma.sauce.conf.js") :
    path.resolve(__dirname, "karma.local.conf.js");
debug(`Loading Karma config file: ${configFile}`);

const config = (karma as any).config.parseConfig(configFile);

function startKarmaServer() {
    return new Promise<number>((resolve, reject) => {
        let browsersReady = false;
        let karmaPort;

        const server = new karma.Server(config);
        server.on("listening", (port) => {
            debug(`Karma server listening on port ${port}`);
            karmaPort = port;

            if (browsersReady && karmaPort) {
                resolve(karmaPort);
            }
        });
        server.on("browsers_ready", () => {
            browsersReady = true;

            if (browsersReady && karmaPort) {
                resolve(karmaPort);
            }
        });
        server.on("browser_register", (browser) => {
            debug(`Browser ${browser} registered.`);
        });
        server.on("browser_start", (browser) => {
            debug(`Browser ${browser} started.`);
        });
        server.on("browser_complete", (browser) => {
            debug(`Browser ${browser} completed.`);
        });
        server.on("run_complete", (browser) => {
            debug("Run completed.");
        });
        server.on("browser_error", (browser, error) => {
            reject(`Browser ${browser} error: ${error}.`);
        });
        server.start();
    });
}

function stopKarmaServer(port: number) {
    return new Promise<number>((resolve, reject) => {
        karma.stopper.stop({ port }, (exitCode) => {
            resolve(exitCode);
        });
    });
}

function runKarmaTests(options: any) {
    return new Promise<number>((resolve, reject) => {
        karma.runner.run(options, (exitCode) => {
            resolve(exitCode);
        });
    });
}

process.stdin.setRawMode(true);
process.stdin.resume();

function waitForAnyKey() {
    return new Promise((resolve, reject) => {
        process.stdin.once("data", resolve);
    });
}

(async () => {
    try {
        const serverPath = path.resolve(__dirname, "..", "bin", configuration, "netcoreapp2.2", "FunctionalTests.dll");

        debug(`Launching Functional Test Server: ${serverPath}`);
        const dotnet = spawn("dotnet", [serverPath], {
            env: {
                ...process.env,
                ["ASPNETCORE_URLS"]: "http://127.0.0.1:0",
            },
        });

        let port: number;
        function cleanup() {
            if (port) {
                stopKarmaServer(port);
            }

            if (dotnet && !dotnet.killed) {
                console.log("Terminating dotnet process");
                dotnet.kill();
            }
        }

        process.on("SIGINT", cleanup);
        process.on("exit", cleanup);

        debug("Waiting for Functional Test Server to start");
        const results = await waitForMatch("dotnet", dotnet, /Now listening on: (http:\/\/[^\/]+:[\d]+)/);
        debug(`Functional Test Server has started at ${results[1]}`);

        debug(`Using SignalR Server: ${results[1]}`);

        // Start karma server
        port = await startKarmaServer();
        debug("Karma is ready to run.");

        // Run the tests
        let exitCode = await runKarmaTests({
            clientArgs: ["--server", results[1]],
            port,
        });
        debug(`Karma run exited with code: ${exitCode}`);
        if (exitCode !== 0) {
            throw new Error("Test run failed!");
        }

        // Stop karma server
        exitCode = await stopKarmaServer(port);
        debug(`Karma server exited with code: ${exitCode}`);
    } catch (e) {
        console.error(`Error: ${e}`);
        process.exit(1);
    }

    process.exit(0);
})();
