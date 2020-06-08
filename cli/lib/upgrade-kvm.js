"use strict";

const pem = require("pem");
const util = require("util");
const debug = require("debug")("upgradekvm");
const request = require("request");
const async = require('async');

const writeConsoleLog = require('microgateway-core').Logging.writeConsoleLog;

const CONSOLE_LOG_TAG_COMP = 'microgateway upgrade kvm';

function generateCredentialsObject(options) {
    if (options.token) {
        return {
            "bearer": options.token
        };
    } else {
        return {
            user: options.key,
            pass: options.secret
        };
    }
}

function updatekvm(options){
    writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP}, 'Reading KVM entries'); 
    var URI = util.format("https://%s-%s.apigee.net/edgemicro-auth/upgradeKvm", options.org, options.env);
    const body = {
        public_key: options.publicKey1
    };
    request({
        uri: URI,
        auth: generateCredentialsObject(options),
        method: "POST",
        json: body
    },function (err, res) {
        if (err){
            writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP},"Error in upgrade kvm: "+ err);
            process.exit(1);
        } else {
            if (res.statusCode === 200){
                writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP}, res.body);
            } else{
                writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP}, res.body);
                process.exit(1);
            }
        } 
    });
}

const UpgradeKVM = function () {

}

module.exports = function () {
  return new UpgradeKVM();
}

UpgradeKVM.prototype.upgradekvm = function upgradekvm(options, cb) {

    options.baseuri = options.mgmtUrl || "https://api.enterprise.apigee.com";
    options.kvm = 'microgateway';
    options.virtualhost = options.virtualhost || 'secure';    

    var publicKeyURI = util.format('https://%s-%s.apigee.net/edgemicro-auth/publicKey', options.org, options.env);

    writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP},"Checking for certificate...");
    request({
        uri: publicKeyURI,
        auth: generateCredentialsObject(options),
        method: "GET"
    }, function(err, res, body) {
        if (err) {
            writeConsoleLog('error',{component: CONSOLE_LOG_TAG_COMP},err);
        } else {
            writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP},"Certificate found!");
            pem.getPublicKey(body, function(err, publicKey) {
                writeConsoleLog('log',{component: CONSOLE_LOG_TAG_COMP},publicKey.publicKey);
                options.publicKey1 = publicKey.publicKey;
                updatekvm(options)
            });
        }
       }
    );
}
