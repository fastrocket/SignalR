// Karma configuration for a SauceLabs-based CI run.
const createKarmaConfig = require("./karma.base.conf");

// "Evergreen" Desktop Browsers
var evergreenBrowsers = {
    // Google Chrome Latest, any OS.
    sl_chrome: {
        base: "SauceLabs",
        browserName: "chrome",
        version: "latest",
    },

    // Mozilla Firefox Latest, any OS
    sl_firefox: {
        base: "SauceLabs",
        browserName: "firefox",
        version: "latest",
    },

    // Microsoft Edge Latest, Windows 10
    sl_edge_win10: {
        base: "SauceLabs",
        browserName: "microsoftedge",
        version: "latest",
    },

    // Apple Safari Latest, macOS 10.13 (High Sierra)
    sl_safari_macOS1013: {
        base: "SauceLabs",
        browsername: "safari",
        version: "latest",
        platform: "OS X 10.13",
    }
}

// Legacy Browsers
var legacyBrowsers = {
    // Microsoft Internet Explorer 11, Windows 7
    sl_ie11_win7: {
        base: "SauceLabs",
        browsername: "internet explorer",
        version: "11",
        platform: "Windows 7",
    },
};

// Mobile Browsers
// TODO: Fill this in.
var mobileBrowsers = {};

module.exports = createKarmaConfig({
    customLaunchers: {
        ...evergreenBrowsers,
        ...legacyBrowsers,
        ...mobileBrowsers,
    },
    browsers: Object.keys(customLaunchers),
    sauceLabs: {
        connectOptions: {
            // Required to enable WebSockets through the Sauce Connect proxy.
            noSslBumpDomains: ["all"]
        }
    },

    // Required to ensure SauceLabs doesn't time out.
    browserDisconnectTimeout : 10000, // default 2000
    browserDisconnectTolerance : 1, // default 0
    browserNoActivityTimeout : 4*60*1000, //default 10000
    captureTimeout : 4*60*1000, //default 60000
});