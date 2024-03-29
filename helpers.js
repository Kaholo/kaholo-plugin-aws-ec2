const {
  AuthorizeSecurityGroupEgressCommand,
  RevokeSecurityGroupIngressCommand,
  RevokeSecurityGroupEgressCommand,
  AuthorizeSecurityGroupIngressCommand,
} = require("@aws-sdk/client-ec2");
const _ = require("lodash");

function strToBase64(value) {
  if (!value) {
    return value;
  }
  return Buffer.from(value).toString("base64");
}

function resolveSecurityGroupCommand(ruleType) {
  switch (ruleType) {
    case "Egress-Authorize":
      return AuthorizeSecurityGroupEgressCommand;
    case "Ingress-Revoke":
      return RevokeSecurityGroupIngressCommand;
    case "Egress-Revoke":
      return RevokeSecurityGroupEgressCommand;
    default:
      return AuthorizeSecurityGroupIngressCommand;
  }
}

function tryParseJson(v) {
  if (_.isPlainObject(v)) {
    return v;
  }
  try {
    return JSON.parse(v);
  } catch {
    throw new Error(`Error occurred while trying to parse value "${v}" to JSON object.`);
  }
}

function createSubnetText(subnet) {
  const textSegments = [subnet.SubnetId];
  const subnetName = subnet.Tags.find(({ Key }) => Key === "Name");
  if (subnetName) {
    textSegments.push(subnetName.Value);
  }
  textSegments.push(subnet.AvailabilityZone);
  return textSegments.join(" | ");
}

function parseSinglePortRange(rawPortRange) {
  if (/^\d+$/.test(rawPortRange)) {
    return { fromPort: +rawPortRange, toPort: +rawPortRange };
  }

  if (/^\d+-\d+$/.test(rawPortRange)) {
    const [fromPort, toPort] = rawPortRange.split("-").map(Number);
    if (fromPort > toPort) {
      throw new Error(`Ports in the "${rawPortRange}" range are defined in the wrong order.`);
    }
    return { fromPort, toPort };
  }

  if (/^\*$/.test(rawPortRange)) {
    return { fromPort: 0, toPort: 65535 };
  }

  throw new Error(`Invalid Port Range string specified: "${rawPortRange}". Valid examples include "*" (all ports), "80" (one port), and "8080-8099" (a range of 20 ports). To configure multiple ports not in a range, create a separate rule for each port.`);
}

function parseInstanceAttributeValue(attributeName, attributeValue) {
  const attributesExpectingBoolean = [
    "DisableApiStop",
    "DisableApiTermination",
    "EbsOptimized",
    "EnaSupport",
    "SourceDestCheck",
  ];

  if (!attributesExpectingBoolean.includes(attributeName)) {
    return attributeValue;
  }
  return attributeValue === "true";
}

module.exports = {
  strToBase64,
  resolveSecurityGroupCommand,
  tryParseJson,
  createSubnetText,
  parseSinglePortRange,
  parseInstanceAttributeValue,
};
