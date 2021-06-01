const aws = require("aws-sdk");
const parsers = require("./parsers")

function getEc2(params, settings) {
    return new aws.EC2({
        region: parsers.autocomplete(params.REGION),
        accessKeyId: params.AWS_ACCESS_KEY_ID || settings.AWS_ACCESS_KEY_ID,
        secretAccessKey: params.AWS_SECRET_ACCESS_KEY || settings.AWS_SECRET_ACCESS_KEY
    });
}

async function runEc2Func(action, settings, params, funcName){
    const ec2 = action.params.ec2 ? action.params.ec2 : getEc2(action.params, settings);
    const resultPromise = new Promise((resolve, reject) => {
        ec2[funcName](params, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
    const result = {};
    result[funcName] = await resultPromise;
    return result;
}

module.exports = {
    getEc2,
    runEc2Func
}