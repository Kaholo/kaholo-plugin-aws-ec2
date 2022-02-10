const { getEc2, getLightsail } = require("./helpers");

const MISSING_OR_INCORRECT_CREDENTIALS_ERROR = "Missing or incorrect credentials - please select valid access and secret keys first";

function paramsMapper(pluginSettings, actionParams) {
  const settings = {};
  const params = {};

  if (pluginSettings && pluginSettings.length > 0) {
    pluginSettings.forEach((setting) => {
      settings[setting.name] = setting.value;
    });
  }

  if (actionParams && actionParams.length > 0) {
    actionParams.forEach((param) => {
      params[param.name] = param.value;
    });
  }

  return { settings, params };
}

async function getInstanceTypes(query, pluginSettings, actionParams) {
  const { settings, params } = paramsMapper(pluginSettings, actionParams);
  const ec2 = getEc2(params, settings);

  const ec2Params = {
    MaxResults: "10",
    Filters: [{
      Name: "location",
      Values: [params.REGION.id],
    }],
  };
  if (query) {
    ec2Params.Filters.push({
      Name: "instance-type",
      Values: [`${query}*`],
    });
  }
  return new Promise((resolve, reject) => {
    ec2.describeInstanceTypeOfferings(ec2Params, (err, data) => {
      if (err) {
        reject(`Can't return instance types: ${err.message || JSON.stringify(err)}`);
      }
      resolve(data.InstanceTypeOfferings.map((instanceTypeOffering) => ({ id: instanceTypeOffering.InstanceType, value: instanceTypeOffering.InstanceType })));
    });
  });
}

async function listRegions(query, pluginSettings, actionParams) {
  let { settings, params } = paramsMapper(pluginSettings, actionParams);
  params = { ...params, REGION: params.REGION || "eu-west-2" };
  const ec2 = getEc2(params, settings);
  const lightsail = getLightsail(params, settings);

  const ec2RegionsPromise = ec2.describeRegions().promise();
  const lightsailRegionsPromise = lightsail.getRegions().promise();

  return Promise.all([ec2RegionsPromise, lightsailRegionsPromise]).then(
    ([ec2Regions, lightsailRegions]) => ec2Regions.Regions.map((ec2Region) => {
      const lsRegion = lightsailRegions.regions.find((x) => x.name === ec2Region.RegionName);
      return lsRegion
        ? { id: ec2Region.RegionName, value: `${ec2Region.RegionName} (${lsRegion.displayName})` }
        : { id: ec2Region.RegionName, value: ec2Region.RegionName };
    }).sort((a, b) => {
      if (a.value > b.value) { return 1; }
      if (a.value < b.value) { return -1; }
      return 0;
    }),
  ).catch((err) => {
    console.error(err);
    throw MISSING_OR_INCORRECT_CREDENTIALS_ERROR;
  });
}

module.exports = { getInstanceTypes, listRegions };
