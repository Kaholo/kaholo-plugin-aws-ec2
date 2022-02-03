const { getEc2, getLightsail } = require('./helpers');

const MISSING_CREDENTIALS_ERROR = "Missing credentials - please select access and secret keys first";

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
                reject(`Can't return instance types: ${err.message || JSON.stringify(err)}`);
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

async function listRegions(query, pluginSettings, actionParams) {
    const { settings, params } = paramsMapper(pluginSettings, actionParams);
    if (!params.REGION) {
        params.REGION = "eu-west-2";
    }
    const ec2 = getEc2(params, settings);
    let results = await new Promise((resolve, reject) => {
        ec2.describeRegions((err, data) => {
            if (err) {
                reject(MISSING_CREDENTIALS_ERROR);
            } else {
                const result = data.Regions.map((endpoint) =>
                    ({id: endpoint.RegionName, value: endpoint.RegionName}));
                resolve(result);
            }
        });
    });

    const lightsail = getLightsail(params, settings);
    return new Promise((resolve, reject) => {
        lightsail.getRegions((err, data) => {
            if (err) {
                reject(MISSING_CREDENTIALS_ERROR);
            } else {
                results = results.map((entry) => {
                    const lsData = data.regions.find((x) => x.name === entry.id);
                    return lsData ?
                        { value: `${lsData.displayName} (${entry.id})`, id: entry.value } :
                        entry;
                }).sort((a, b) => {
                    if (a.value > b.value) return 1;
                    if (a.value < b.value) return -1;
                    return 0;
                });
                resolve(results);
            }
        });
    });
}

module.exports = { getInstanceTypes, getRegions, listRegions }
