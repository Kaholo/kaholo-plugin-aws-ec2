const { getEc2 } = require('./helpers');

function paramsMapper(pluginSettings,actionParams){
    const settings = {};
    const params = {};

    if (pluginSettings && pluginSettings.length > 0) {
        pluginSettings.forEach(setting=>{
            settings[setting.name] = setting.value;
        })
    }

    if (actionParams && actionParams.length > 0) {
        actionParams.forEach(param=>{
            params[param.name] = param.value;
        })
    }

    return {settings, params};
}

async function getInstanceTypes(query, pluginSettings, actionParams){
    const {settings, params} = paramsMapper(pluginSettings,actionParams);
    const ec2 = getEc2(params, settings);
        
    let ec2Params = {
        MaxResults: "10",
        Filters: [{
            Name: "location",
            Values: [ params.REGION.id ]
        }]
    }
    if (query){
        ec2Params.Filters.push({
            Name: "instance-type",
            Values: [ `${query}*` ]
        });
    }
    return new Promise((resolve, reject) => {
        ec2.describeInstanceTypeOfferings(ec2Params, function(err, data){
            if (err){
                reject(err);
            }
            resolve(data.InstanceTypeOfferings.map(instanceTypeOffering => {
                return { id: instanceTypeOffering.InstanceType, value: instanceTypeOffering.InstanceType };
            }));
        });
    });
}

const regionsList = [
    { "id": "us-east-1", "value": "US East 1 (N. Virginia)" },
    { "id": "us-east-2", "value": "US East 2 (Ohio)" },
    { "id": "us-west-1", "value": "US West 1 (N. California)" },
    { "id": "us-west-2", "value": "US West 2 (Oregon)" },
    { "id": "ap-southeast-1", "value": "Asia Pacific Southeast 1 (Singapore)" },
    { "id": "ap-southeast-2", "value": "Asia Pacific Southeast 2 (Sydney)" },
    { "id": "ap-northeast-1", "value": "Asia Pacific Northeast (Tokyo)" },
    { "id": "eu-west-1", "value": "EU West(Ireland)" },
    { "id": "sa-east-1", "value": "South America East (São Paulo)" },
    { "id": "eu-central-1", "value": "EU Central(Frankfurt)" }
];

async function getRegions(query, _, _){
    return regionsList.filter(region => { return !query || region.id.includes(query) || region.value.includes(query) });
}


module.exports = { getInstanceTypes, getRegions }