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

module.exports = {
  strToBase64,
  resolveSecurityGroupFunction,
};
