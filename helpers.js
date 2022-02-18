const aws = require("aws-sdk");
const parsers = require("./parsers");

function getEc2(params, settings) {
  return new aws.EC2({
    region: parsers.autocomplete(params.REGION),
    accessKeyId: params.AWS_ACCESS_KEY_ID || settings.AWS_ACCESS_KEY_ID,
    secretAccessKey: params.AWS_SECRET_ACCESS_KEY || settings.AWS_SECRET_ACCESS_KEY,
  });
}

function getLightsail(params, settings) {
  return new aws.Lightsail({
    region: parsers.autocomplete(params.REGION),
    accessKeyId: params.AWS_ACCESS_KEY_ID || settings.AWS_ACCESS_KEY_ID,
    secretAccessKey: params.AWS_SECRET_ACCESS_KEY || settings.AWS_SECRET_ACCESS_KEY,
  });
}

async function runEc2Func(action, settings, params, funcName) {
  const actionCopy = { ...action };
  actionCopy.params.ec2 = actionCopy.params.ec2 || getEc2(actionCopy.params, settings);
  const resultPromise = new Promise((resolve, reject) => {
    actionCopy.params.ec2[funcName](params, (err, result) => {
      if (err) { reject(err); } else { resolve(result); }
    });
  });
  const result = {};
  result[funcName] = await resultPromise;
  return result;
}

async function waitForEc2Resource(action, state, params) {
  const ec2 = action.params.ec2 || getEc2(action.params);
  return new Promise((resolve, reject) => {
    ec2.waitFor(state, params, (err, result) => {
      if (err) { return reject(err); }
      return resolve(result);
    });
  });
}

function parseLegacyParam(param, parseFunc) {
  let parsedParam;
  if (typeof param === "string") {
    try {
      parsedParam = JSON.parse(param);
    } catch {
      parsedParam = parseFunc(param);
    }
  } else {
    parsedParam = parseFunc(param);
  }
  return parsedParam;
}

function getPortObj(fromPort, toPort, ipProtocol, cidrIps, cidrIps6, description) {
  const obj = {
    FromPort: fromPort,
    ToPort: toPort,
    IpProtocol: ipProtocol,
  };
  if (cidrIps6.length > 0) {
    obj.Ipv6Ranges = cidrIps6.map((CidrIpv6) => ({
      CidrIpv6,
      Description: description,
    }));
  }
  if (cidrIps.length > 0) {
    obj.IpRanges = cidrIps.map((CidrIp) => ({
      CidrIp,
      Description: description,
    }));
  }
  return obj;
}

async function waitForNatGateway(action, settings) {
  const params = { NatGatewayIds: [action.params.natGatewayId] };
  let result;
  while (!result || result.describeNatGateways.NatGateways[0].State !== "available") {
    // TODO: take a look if this loop is really needed
    // eslint-disable-next-line no-await-in-loop
    result = await runEc2Func(action, settings, params, "describeNatGateways");
  }
}

module.exports = {
  getEc2,
  getLightsail,
  runEc2Func,
  parseLegacyParam,
  getPortObj,
  waitForNatGateway,
  waitForEc2Resource,
};
