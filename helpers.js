const _ = require("lodash");

function strToBase64(value) {
  if (!value) { return value; }
  return Buffer.from(value).toString("base64");
}

function resolveSecurityGroupFunction(ruleType) {
  switch (ruleType) {
    case "Egress-Authorize":
      return "authorizeSecurityGroupEgress";
    case "Ingress-Revoke":
      return "revokeSecurityGroupIngress";
    case "Egress-Revoke":
      return "revokeSecurityGroupEgress";
    default:
      return "authorizeSecurityGroupIngress";
  }
}

function parseObjectLikeParam(param) {
  if (_.isPlainObject(param)) {
    return param;
  }
  try {
    return JSON.parse(param);
  } catch {
    throw new Error(`Error occurred while trying to parse value "${param}" to JSON object.`);
  }
}

module.exports = {
  strToBase64,
  resolveSecurityGroupFunction,
  parseObjectLikeParam,
};
