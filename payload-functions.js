const { helpers, parsers } = require("kaholo-aws-plugin");
const _ = require("lodash");
const { strToBase64 } = require("./helpers");

function prepareCreateInstancePayload(params) {
  const maxCount = parsers.number(params.MaxCount);
  const minCount = parsers.number(params.MinCount);

  if (maxCount < minCount) {
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
    MaxCount: maxCount,
    MinCount: minCount,
    SecurityGroupIds: parsers.array(params.SecurityGroupIds),
    UserData: strToBase64(params.UserData),
    TagSpecifications: helpers.handleTagSpecification("instance", [params.TagSpecifications, ...nameTag]),
  };
}

function prepareManageInstancesPayload(params) {
  const instances = parsers.array(params.InstanceIds);

  if (_.isEmpty(instances)) {
    throw new Error("You must provide at least one Instance ID");
  }

  return {
    InstanceIds: instances,
  };
}

function prepareDescribeInstancesPayload(params) {
  const payload = {
    ...params,
    MaxResults: parsers.number(params.MaxResults),
    InstanceIds: parsers.array(params.InstanceIds),
    Filters: parsers.array(params.Filters),
  };

  // EC2 does not allow MaxResults if I
  // nstanceIds are provided
  if (payload.InstanceIds.length) {
    return _.omit(payload, "MaxResults");
  }

  return payload;
}

function prepareCreateVpcPayload(params) {
  if (!params.CidrBlock && !params.AmazonProvidedIpv6CidrBlock) {
    throw new Error("Must provide CIDR Block or select AmazonProvidedIpv6CidrBlock");
  }

  return {
    ...(_.pick(params, ["CidrBlock", "AmazonProvidedIpv6CidrBlock", "InstanceTenancy", "DryRun"])),
    TagSpecifications: helpers.handleTagSpecification("vpc", params.tags),
  };
}

function prepareCreateInternetGatewayPayload(params) {
  return {
    DryRun: params.DryRun,
    TagSpecifications: helpers.handleTagSpecification("internet-gateway", params.tags),
  };
}

function prepareCreateRouteTablePayload(params) {
  if (!params.VpcId) {
    throw new Error("Didn't provide VPC ID!");
  }

  return {
    VpcId: params.VpcId,
    DryRun: params.DryRun,
    TagSpecifications: helpers.handleTagSpecification("route-table", params.Tags),
  };
}

function prepareCreateNatGatewayPayload(params) {
  if (!params.SubnetId) {
    throw new Error("Must provide Subnet ID");
  }

  return {
    ...(_.pick(params, ["SubnetId", "AllocationId", "DryRun"])),
    TagSpecifications: helpers.handleTagSpecification("natgateway", params.Tags),
  };
}

function validateAssociateRouteTableParams(params) {
  if (!params.RouteTableId) {
    throw new Error("Route Table ID was not given!");
  }

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
    TagSpecifications: helpers.handleTagSpecification("security-group", params.Tags),
  };
}

function prepareCreateSubnetPayload(params) {
  if (!params.CidrBlock && !params.AmazonProvidedIpv6CidrBlock) {
    throw new Error("Must either provide CIDR Block or select AmazonProvidedIpv6CidrBlock");
  }

  return {
    ...(_.pick(params, [
      "AvailabilityZone",
      "CidrBlock",
      "Ipv6CidrBlock",
      "VpcId",
      "OutpostArn",
      "DryRun",
    ])),
    TagsSpecifications: helpers.handleTagSpecification("subnet", params.Tags),
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
  prepareManageInstancesPayload,
  prepareDescribeInstancesPayload,
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
