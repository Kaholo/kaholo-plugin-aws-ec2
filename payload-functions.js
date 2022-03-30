const { helpers } = require("kaholo-aws-plugin");
const _ = require("lodash");
const { strToBase64 } = require("./helpers");

function prepareCreateInstancePayload(params) {
  if (params.maxCount < params.minCount) {
    throw new Error("Max Count must be bigger or equal to Min Count");
  }

  const nameTag = [];
  if (!_.isEmpty(params.NameTag)) {
    nameTag.push({
      Key: "Name",
      Value: params.NameTag,
    });
  }

  return {
    ...(_.omit(params, "NameTag")),
    UserData: strToBase64(params.UserData),
    TagSpecifications: helpers.buildTagSpecification("instance", [params.TagSpecifications, ...nameTag]),
  };
}

function prepareCreateVpcPayload(params) {
  if (!params.CidrBlock && !params.AmazonProvidedIpv6CidrBlock) {
    throw new Error("Must provide CIDR Block or select AmazonProvidedIpv6CidrBlock");
  }

  return {
    ...(_.pick(params, ["CidrBlock", "AmazonProvidedIpv6CidrBlock", "InstanceTenancy", "DryRun"])),
    TagSpecifications: helpers.buildTagSpecification("vpc", params.tags),
  };
}

function prepareCreateInternetGatewayPayload(params) {
  return {
    DryRun: params.DryRun,
    TagSpecifications: helpers.buildTagSpecification("internet-gateway", params.tags),
  };
}

function prepareCreateRouteTablePayload(params) {
  return {
    VpcId: params.VpcId,
    DryRun: params.DryRun,
    TagSpecifications: helpers.buildTagSpecification("route-table", params.Tags),
  };
}

function prepareCreateNatGatewayPayload(params) {
  return {
    ...(_.pick(params, ["SubnetId", "AllocationId", "DryRun"])),
    TagSpecifications: helpers.buildTagSpecification("natgateway", params.Tags),
  };
}

function validateAssociateRouteTableParams(params) {
  if (!params.SubnetId && !params.GatewayId) {
    throw new Error("You need to provide a Subnet ID or a Gateway ID!");
  }
}

function prepareAssociateRouteTableToSubnetPayload(params) {
  validateAssociateRouteTableParams(params);
  if (!params.SubnetId) {
    throw new Error("Subnet ID is missing!");
  }
  return _.omit(params, "GatewayId");
}

function prepareAssociateRouteTableToGatewayPayload(params) {
  validateAssociateRouteTableParams(params);
  if (!params.GatewayId) {
    throw new Error("Gateway ID is missing!");
  }
  return _.omit(params, "SubnetId");
}

function prepareCreateSecurityGroupPayload(params) {
  return {
    ...(_.omit(params, "Tags")),
    TagSpecifications: helpers.buildTagSpecification("security-group", params.Tags),
  };
}

function prepareCreateSubnetPayload(params) {
  if (!params.CidrBlock && !params.Ipv6CidrBlock) {
    throw new Error("Must either provide CIDR Block or select AmazonProvidedIpv6CidrBlock");
  }

  return {
    ...(_.pick(params, [
      "VpcId",
      "AvailabilityZone",
      "CidrBlock",
      "Ipv6CidrBlock",
      "OutpostArn",
      "DryRun",
    ])),
    TagsSpecifications: helpers.buildTagSpecification("subnet", params.Tags),
  };
}

function prepareAddSecurityGroupRulesPayload(params) {
  if (params.FromPorts.length !== params.ToPorts.length) {
    throw new Error("From Ports and To Ports must be the same length");
  }

  const ipv6Ranges = params.CidrIps6.map((CidrIpv6) => ({
    CidrIpv6,
    Description: params.Description,
  }));

  const ipRanges = params.CidrIps.map((CidrIp) => ({
    CidrIp,
    Description: params.Description,
  }));

  return helpers.removeUndefinedAndEmpty({
    GroupId: params.GroupId,
    IpPermissions: params.FromPorts.map((fromPort, index) => ({
      FromPort: fromPort,
      ToPort: params.ToPorts[index],
      IpProtocol: params.IpProtocol,
    })),
    Ipv6Ranges: ipv6Ranges,
    IpRanges: ipRanges,
  });
}

module.exports = {
  prepareCreateInstancePayload,
  prepareCreateVpcPayload,
  prepareCreateInternetGatewayPayload,
  prepareCreateRouteTablePayload,
  prepareCreateNatGatewayPayload,
  prepareAssociateRouteTableToSubnetPayload,
  prepareAssociateRouteTableToGatewayPayload,
  prepareCreateSecurityGroupPayload,
  prepareCreateSubnetPayload,
  prepareAddSecurityGroupRulesPayload,
};
