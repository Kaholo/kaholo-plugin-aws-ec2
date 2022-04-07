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

function tryParseJson(v) {
  if (_.isPlainObject(v)) { return v; }
  try {
    return JSON.parse(v);
  } catch {
    throw new Error(`Error occurred while trying to parse value "${v}" to JSON object.`);
  }
}

function randomString() {
  return Math.random().toString(36).slice(2);
}

async function createDedicatedSecurityGroup(client, params) {
  const securityGroupName = (params.NAME_TAG ? `${params.NAME_TAG}-` : "") + randomString();
  const securityGroupDescription = `Dedicated security group${params.NAME_TAG ? ` for instance ${params.NAME_TAG}` : ""}`;
  const { GroupId: securityGroupId } = await client.createSecurityGroup({
    GroupName: securityGroupName,
    Description: securityGroupDescription,
  }).promise();
  // Remove outbound rules
  if (params.DISALLOW_OUTBOUND_TRAFFIC) {
    // Get security group rules
    const { SecurityGroupRules: groupRules } = await client.describeSecurityGroupRules({
      Filters: [{
        Name: "group-id",
        Values: [securityGroupId],
      }],
    }).promise();
    // Filter out the egress rules and map the ids
    const groupRuleIds = groupRules
      .filter((rule) => rule.IsEgress)
      .map((rule) => rule.SecurityGroupRuleId);
    // Revoke the rules
    await client.revokeSecurityGroupEgress({
      GroupId: securityGroupId,
      SecurityGroupRuleIds: groupRuleIds,
    }).promise();
  }
  return { securityGroupId };
}

module.exports = {
  strToBase64,
  resolveSecurityGroupFunction,
  tryParseJson,
  randomString,
  createDedicatedSecurityGroup,
};
