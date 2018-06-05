// Karma configuration for a local run (the default)
const createKarmaConfig = require("./karma.base.conf");
const fs = require("fs");

// Bring in the launchers directly to detect browsers
const ChromeHeadlessBrowser = require("karma-chrome-launcher")["launcher:ChromeHeadless"][1];
const ChromiumHeadlessBrowser = require("karma-chrome-launcher")["launcher:ChromiumHeadless"][1];
const FirefoxHeadlessBrowser = require("karma-firefox-launcher")["launcher:FirefoxHeadless"][1];

let reporters = ["progress"];

if (process.env.TEAMCITY_VERSION) {
  reporters.push("teamcity");
}

let browsers = [];

function tryAddBrowser(name, b) {
  var path = b.DEFAULT_CMD[process.platform];
  if (b.ENV_CMD && process.env[b.ENV_CMD]) {
    path = process.env[b.ENV_CMD];
  }
  if (fs.existsSync(path)) {
    browsers.push(name);
  }
}

// Hacky AF way to use the launcher itself to detect the browser.
tryAddBrowser("ChromeHeadless", new ChromeHeadlessBrowser(() => {}, {}));
tryAddBrowser("ChromiumHeadless", new ChromiumHeadlessBrowser(() => {}, {}));
tryAddBrowser("FirefoxHeadless", new FirefoxHeadlessBrowser(0, () => {}, {}));

module.exports = createKarmaConfig({
  browsers,
  reporters,
});