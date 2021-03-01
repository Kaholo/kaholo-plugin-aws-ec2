const aws = require("aws-sdk");
const parsers = require("./parsers")

function getEc2(action, settings) {
    return getEc2FromParams(action.params, settings);
}

function getEc2FromParams(params, settings) {
    return new aws.EC2({
        region: parsers.autocomplete(params.REGION),
        accessKeyId: params.AWS_ACCESS_KEY_ID || settings.AWS_ACCESS_KEY_ID,
        secretAccessKey: params.AWS_SECRET_ACCESS_KEY || settings.AWS_SECRET_ACCESS_KEY
    });
}

function handleParams(param) {
    if (typeof param == 'string') {
        try {
            return JSON.parse(param);
        } catch (err) {
            return param;
        }
    }
    else
        return param;
}

function operationCallback(resolve,reject) {
    return function(err,result){
        if (err) reject(err);
        else resolve(result);
    }
}

module.exports = {
    getEc2,
    getEc2FromParams,
    handleParams,
    operationCallback
}