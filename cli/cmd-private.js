'use strict';

var app = require('commander');
var privateOperations = require('./lib/private')();
//const debug = require('debug')('configure');
const upgradekvm = require('./lib/upgrade-kvm')();
const upgradeauth = require('./lib/upgrade-edgeauth')();
const rotatekey = require('./lib/rotate-key')();
const writeConsoleLog = require('microgateway-core').Logging.writeConsoleLog;

const CONSOLE_LOG_TAG_COMP = 'microgateway cmd private';

var prompt = require('cli-prompt');

module.exports = function() {
    app
        .command('configure')
        .description('Automated, one-time setup of edgemicro with Apigee Private Cloud')
        .option('-o, --org <org>', 'the organization')
        .option('-r, --runtime-url <runtimeUrl>', 'the URL of the runtime server')
        .option('-m, --mgmt-url <mgmtUrl>', 'the URL of the management server')
        .option('-e, --env <env>', 'the environment')
        .option('-u, --username <user>', 'username of the organization admin')
        .option('-p, --password <password>', 'password of the organization admin')
        .option('-v, --virtual-hosts <virtualHosts>', 'comma separated virtual hosts to deploy with')
        .option('-c, --configDir <configDir>', 'Set the directory where configs are read from.')
        .option('-t, --token <token>', 'OAuth token to use with management API')
        .option('-k  --key <key>', 'Path to private key to be used by Apigee Edge')
        .option('-s  --cert <cert>', 'Path to certificate to be used by Apigee Edge')
        .option('-d, --debug', 'execute with debug output')

        .action((options) => {
            options.error = optionError(options);
            options.token = options.token || process.env.EDGEMICRO_SAML_TOKEN;
            options.configDir = options.configDir || process.env.EDGEMICRO_CONFIG_DIR;

            if (!options.org) {
                return options.error('org is required');
            }
            if (!options.env) {
                return options.error('env is required');
            }            
            //if token is not passed, username is mandatory
            if (!options.token) {
                //If there is no token then we can go through the password process
                if (!options.username) {
                    return options.error('username is required');
                }
                if (!options.password) {
                    promptForPassword(options, (options) => {
                        if (!options.password) {
                            return options.error('password is required');
                        }
                    });
                }
            }

            if (options.key || options.cert) {
                if (!options.key || !options.cert) {
                    return options.error('key and cert must be passed together');
                }
            }

            if (!options.runtimeUrl) {
                return options.error('runtimeUrl is required');
            }
            if (!options.mgmtUrl) {
                return options.error('mgmtUrl is required');
            }
            if (!options.runtimeUrl.includes('http')) {
                return options.error('runtimeUrl requires a prototcol http or https');
            }
            if (!options.mgmtUrl.includes('http')) {
                return options.error('runtimeUrl requires a prototcol http or https');
            }

            privateOperations.configureEdgemicro(options);
        });

    app
        .command('upgradekvm')
        .option('-o, --org <org>', 'the organization')
        .option('-e, --env <env>', 'the environment')
        .option('-k, --key <key>', 'key for authenticating with Edge')
        .option('-s, --secret <secret>', 'secret for authenticating with Edge')
        .option('-p, --proxyuri <proxyuri>', 'proxyuri for edgeauth proxy')
        .description('upgrade kvm to support JWT Key rotation')
        .action((options) => {
            options.error = optionError(options);

            if (!options.key) {
                return options.error('key is required');
            }
            if (!options.secret) {
                return options.error('secret is required');
            }
            if (!options.org) {
                return options.error('org is required');
            }
            if (!options.env) {
                return options.error('env is required');
            }
            if (!options.proxyuri) {
                return options.error('proxyuri is required')
            }
            if (options.proxyuri && !options.proxyuri.includes('http')) {
                return options.error('proxyuri requires a prototcol http or https')
            }
            upgradekvm.upgradekvm(options);

        });

    app
        .command('upgradeauth')
        .option('-o, --org <org>', 'the organization')
        .option('-e, --env <env>', 'the environment')
        .option('-u, --username <user>', 'username of the organization admin')
        .option('-p, --password <password>', 'password of the organization admin')
        .option('-v, --virtualhost <virtualhost>', 'virtual host of the proxy')
        .option('-m, --mgmt-url <mgmtUrl>', 'the URL of the management server')
        .option('-t, --token <token>', 'OAuth token to use with management API')
        .description('upgrade edgemicro-auth proxy')
        .action((options) => {
            options.error = optionError(options);
            options.token = options.token || process.env.EDGEMICRO_SAML_TOKEN;
            options.noncpsOrg = true;
            if (!options.token) {
                if (!options.username) {
                    return options.error('username is required');
                }

                promptForPassword(options, (options) => {
                    if (!options.password) {
                        return options.error('password is required');
                    }
                });
            }
            if (!options.org) {
                return options.error('org is required');
            }
            if (!options.env) {
                return options.error('env is required');
            }
            if (!options.mgmtUrl) {
                return options.error('mgmtUrl is required');
            }
            if (!options.mgmtUrl.includes('http')) {
                return options.error('runtimeUrl requires a prototcol http or https')
            }

            upgradeauth.upgradeauth(options, () => {});

        });

    app
        .command('rotatekey')
        .option('-o, --org <org>', 'the organization')
        .option('-e, --env <env>', 'the environment')
        .option('-k, --key <key>', 'key for authenticating with Edge')
        .option('-s, --secret <secret>', 'secret for authenticating with Edge')
        .option('-i, --kid <kid>', 'new key identifier')
        .option('-r, --rotatekeyuri <rotatekeyuri>', 'Rotate key url')
        .option('-n, --nbf <nbf>', 'not before time in minutes')
        .option('-p, --privatekey <privatekey>', 'Path to private key to be used by Apigee Edge')
        .option('-c, --cert <cert>', 'Path to certificate to be used by Apigee Edge')
        .description('Rotate JWT Keys')
        .action((options) => {
            options.error = optionError(options);
            if (!options.key) {
                return options.error('key is required');
            }
            if (!options.secret) {
                return options.error('secret is required');
            }
            if (!options.org) {
                return options.error('org is required');
            }
            if (!options.env) {
                return options.error('env is required');
            }
            if (!options.rotatekeyuri) {
                return options.error('rotatekeyuri is required')
            }
            if (options.rotatekeyuri && !options.rotatekeyuri.includes('http')) {
                return options.error('rotatekeyuri requires a prototcol http or https')
            }
            if (options.nbf && options.nbf !== 'undefined' && isNaN(options.nbf)){
                return options.error('nbf value should be numeric');
            }else if(options.nbf && options.nbf !== 'undefined' && options.nbf - Math.floor(options.nbf) !== 0){
                return options.error('nbf value should be numeric and whole number');
            }
            if (options.privatekey || options.cert) {
                if (!options.privatekey || !options.cert) {
                    return options.error('privatekey and cert must be passed together');
                }
            }
            rotatekey.rotatekey(options);
        });

    app.parse(process.argv);

    var running = false;
    app.commands.forEach(function(command) {
        if (command._name === app.rawArgs[2]) {
            running = true;
        }
    });
    if (!running) {
        app.help();
    }
}
// prompt for a password if it is not specified
function promptForPassword(options, cb) {

    if (options.password) {
        cb(options);
    } else {
        prompt.password("password:", function(pw) {
            options.password = pw;
            cb(options);
        });
    }
}

function optionError(caller) {
    return(((obj) => { 
      return((message) => {
        writeConsoleLog('error',{component: CONSOLE_LOG_TAG_COMP},message);
        obj.help();  
      });
     })(caller))
}
  
