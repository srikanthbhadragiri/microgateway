"use strict";

const tmp = require('tmp');
const cpr = require('cpr');
const async = require('async');
const rimraf = require('rimraf');
//const util = require("util");
//const debug = require("debug")("jwkrotatekey");
//const request = require("request");
var deployAuthLib = require('./deploy-auth');
var deployAuth;

const path = require('path');
const writeConsoleLog = require('microgateway-core').Logging.writeConsoleLog;

const CONSOLE_LOG_TAG_COMP = 'microgateway upgrade edgeauth';

const UpgradeAuth = function() {

}

module.exports = function() {
    return new UpgradeAuth();
}

UpgradeAuth.prototype.upgradeauth = function upgradeauth(options /*, cb */) {
    const opts = {
        org: options.org,
        env: options.env,
        username: options.username,
        password: options.password,
        basepath: '/edgemicro-auth',
        debug: false,
        verbose: true,
        proxyName: 'edgemicro-auth',
        directory: path.join(__dirname, '../..', 'node_modules', 'microgateway-edgeauth'),
        'import-only': false,
        'resolve-modules': false,
        virtualHosts: options.virtualhost || 'secure',
        noncpsOrg: options.noncpsOrg
    };

    var edge_config = {
        managementUri: options.mgmtUrl || 'na',
        authUri: 'na',
        virtualhosts: opts.virtualHosts
    };

    var tasks = [];

    if (options.token) {
        opts.token = options.token;
    } else {
        opts.username = options.username;
        opts.password = options.password;
    }

    deployAuth = deployAuthLib(edge_config, null);

    const homeDir = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
    var tmpDir = tmp.dirSync({
        keep: true,
        dir: path.resolve(homeDir, '.edgemicro')
    });

    tasks.push(function(cb) {
        cpr(path.resolve(__dirname, '..', '..', 'node_modules', 'microgateway-edgeauth'), tmpDir.name, cb);
    });

    tasks.push(function(cb) {
        const dir = tmpDir.name;
        deployAuth.deployProxyWithPassword(options.mgmtUrl, 'na', opts, dir, function(err , result ) {
            if (err) {
                writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP},err);
                cb(err);
            }else{
                writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP}, 'Clear temp files');
                rimraf(tmpDir.name, cb);
            }
        });
    });

    async.series(tasks, function(err) {
        writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP}, 'Clear temp files');
        rimraf(tmpDir.name);
        if (err) {
            writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP},err);
        }
    });
}
