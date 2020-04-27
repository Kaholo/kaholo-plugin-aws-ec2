const aws = require("aws-sdk");

module.exports.getEc2 = function(action, settings) {
    return new aws.EC2({
        region: action.params.REGION,
        accessKeyId: action.params.AWS_ACCESS_KEY_ID || settings.AWS_ACCESS_KEY_ID,
        secretAccessKey: action.params.AWS_SECRET_ACCESS_KEY || settings.AWS_SECRET_ACCESS_KEY
    });
}

module.exports.handleParams = function (param) {
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

module.exports.operationCallback = function (resolve,reject) {
    return function(err,result){
        if (err) reject(err);
        else resolve(result);
    }
}
