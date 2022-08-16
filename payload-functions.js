const { helpers } = require("@kaholo/aws-plugin-library");
const _ = require("lodash");
const { strToBase64, tryParseJson, parseSinglePortRange } = require("./helpers");
const { AWS_DEFAULT_MAX_RESULTS, AWS_MATCH_ALL_CODE } = require("./consts.json");

function prepareCreateInstancePayload(params) {
  if (params.MAX_COUNT < params.MIN_COUNT) {
    throw new Error("Max Count must be bigger or equal to Min Count");
  }

  const nameTag = [];
  if (!_.isEmpty(params.NAME_TAG)) {
    nameTag.push({
      Key: "Name",
      Value: params.NAME_TAG,
    });
  }

  return {
    ImageId: params.IMAGE_ID,
    InstanceType: params.INSTANCE_TYPE,
    KeyName: params.KEY_NAME,
    SecurityGroupIds: params.SECURITY_GROUP_IDS,
    UserData: strToBase64(params.USER_DATA),
    MinCount: params.MIN_COUNT,
    MaxCount: params.MAX_COUNT,
    SubnetId: params.subnetId,
    TagSpecifications: helpers.buildTagSpecification("instance", [params.TagSpecifications, ...nameTag]),
  };
}

function prepareManageInstancesPayload(params) {
  return {
    InstanceIds: params.INSTANCE_IDS,
  };
}

function prepareDescribeInstancesPayload(params) {
  const payload = {
    DryRun: params.dryRun,
  };
  if (params.filters) {
    payload.Filters = tryParseJson(params.filters);
  }
  if (params.INSTANCE_IDS) {
    payload.InstanceIds = params.INSTANCE_IDS;
  } else {
    payload.MaxResults = AWS_DEFAULT_MAX_RESULTS;
  }
  if (params.nextToken) {
    payload.NextToken = params.nextToken;
  }
  return payload;
}

function prepareCreateVpcPayload(params) {
  if (!params.cidrBlock && !params.amazonProvidedIpv6CidrBlock) {
    throw new Error("Must provide CIDR Block or select AmazonProvidedIpv6CidrBlock");
  }
  return {
    CidrBlock: params.cidrBlock,
    AmazonProvidedIpv6CidrBlock: params.amazonProvidedIpv6CidrBlock,
    InstanceTenancy: params.instanceTenancy,
    DryRun: params.dryRun,
    Tags: helpers.buildTagSpecification("vpc", params.tags),
  };
}

function prepareDeleteVpcPayload(params) {
  return {
    VpcId: params.vpcId,
    DryRun: params.dryRun,
  };
}

function prepareCreateInternetGatewayPayload(params) {
  return {
    DryRun: params.dryRun,
    TagSpecifications: helpers.buildTagSpecification("internet-gateway", params.tags),
  };
}

function prepareAttachInternetGatewayPayload(params) {
  return {
    DryRun: params.dryRun,
    InternetGatewayId: params.gatewayId,
    VpcId: params.vpcId,
  };
}

function prepareCreateRouteTablePayload(params) {
  return {
    VpcId: params.vpcId,
    DryRun: params.dryRun,
    TagSpecifications: helpers.buildTagSpecification("route-table", params.tags),
  };
}

function prepareCreateRoutePayload(params) {
  return {
    RouteTableId: params.routeTableId,
    GatewayId: params.gatewayId,
    NatGatewayId: params.natGatewayId,
    InstanceId: params.instanceId,
    DestinationCidrBlock: params.destinationCidrBlock,
    DryRun: params.dryRun,
  };
}

function prepareCreateNatGatewayPayload(params) {
  return {
    AllocationId: params.allocationId,
    SubnetId: params.subnetId,
    DryRun: params.dryRun,
    TagSpecifications: helpers.buildTagSpecification("natgateway", params.tags),
  };
}

function validateAssociateRouteTableParams(params) {
  if (!params.subnetId && !params.gatewayId) {
    throw new Error("You need to provide a Subnet ID or a Gateway ID!");
  }
}

function prepareAssociateRouteTableToSubnetPayload(params) {
  validateAssociateRouteTableParams(params);
  if (!params.subnetId) {
    throw new Error("Subnet ID is missing!");
  }

  return {
    RouteTableId: params.routeTableId,
    SubnetId: params.subnetId,
  };
}

function prepareAssociateRouteTableToGatewayPayload(params) {
  validateAssociateRouteTableParams(params);
  if (!params.gatewayId) {
    throw new Error("Gateway ID is missing!");
  }

  return {
    RouteTableId: params.routeTableId,
    GatewayId: params.gatewayId,
  };
}

function prepareCreateSecurityGroupPayload(params) {
  return {
    GroupName: params.name,
    Description: params.description,
    VpcId: params.vpcId,
    DryRun: params.dryRun,
    TagSpecifications: helpers.buildTagSpecification("security-group", params.tags),
  };
}

function prepareCreateSubnetPayload(params) {
  if (!params.cidrBlock && !params.ipv6CidrBlock) {
    throw new Error("Must either provide CIDR Block or select IPv6 CIDR Block");
  }

  return {
    VpcId: params.vpcId,
    RouteTableId: params.routeTableId,
    AvailabilityZone: params.availabilityZone,
    CidrBlock: params.cidrBlock,
    Ipv6CidrBlock: params.ipv6CidrBlock,
    OutpostArn: params.outpostArn,
    DryRun: params.dryRun,
    TagsSpecifications: helpers.buildTagSpecification("subnet", params.tags),
  };
}

function prepareDeleteSubnetPayload(params) {
  return {
    SubnetId: params.subnetId,
    DryRun: params.dryRun,
  };
}

function validateAddSecurityGroupRulesParams(params) {
  if (params.ipProtocol !== "ICMP" && params.ipProtocol !== "All") {
    if (!params.portRanges?.length) {
      throw new Error(`Protocol ${params.ipProtocol} requires a port range. Please use the Port Range parameter to specify a single port, range of ports, or "*" for all ports.`);
    }
  } else if (params.ipProtocol === "ICMP" && (params.portRanges?.length)) {
    throw new Error("Ports cannot be configured for protocol ICMP, use parameter \"ICMP Type\" instead.");
  }
  if (params.ipProtocol === "All") {
    const allowedPortRangesForProtocolAll = [AWS_MATCH_ALL_CODE, "*", "0-65535"];
    const arePortRangesLegal = !params.portRanges?.length || params.portRanges.every((port) => (
      allowedPortRangesForProtocolAll.includes(port)
    ));
    if (!arePortRangesLegal) {
      throw new Error("Specifying All IP Protocols allows all traffic and cannot be restricted by Port Range. If you intend to allow a specific Port Range, please use TCP or UDP instead.");
    }
  }
}

function prepareAddSecurityGroupRulesPayload(params) {
  validateAddSecurityGroupRulesParams(params);

  const ipProtocol = params.ipProtocol === "All" ? AWS_MATCH_ALL_CODE : params.ipProtocol.toLowerCase();
  const ipv6Ranges = params.cidrIps6?.map((CidrIpv6) => helpers.removeUndefinedAndEmpty({
    CidrIpv6,
    Description: params.description,
  }));
  const ipv4Ranges = params.cidrIps?.map((CidrIp) => helpers.removeUndefinedAndEmpty({
    CidrIp,
    Description: params.description,
  }));

  const ipRanges = {};
  if (ipv4Ranges) {
    ipRanges.IpRanges = ipv4Ranges;
  }
  if (ipv6Ranges) {
    ipRanges.Ipv6Ranges = ipv6Ranges;
  }

  let ipPermissions = [];
  switch (ipProtocol) {
    case AWS_MATCH_ALL_CODE:
      ipPermissions = [{
        IpProtocol: AWS_MATCH_ALL_CODE,
        ...ipRanges,
      }];
      break;
    case "icmp":
      ipPermissions = [{
        IpProtocol: "icmp",
        FromPort: params.icmpType,
        ToPort: +AWS_MATCH_ALL_CODE,
        ...ipRanges,
      }];
      break;
    default: {
      const parsedPortRanges = params.portRanges.map(parseSinglePortRange);
      ipPermissions = parsedPortRanges.map(({ fromPort, toPort }) => ({
        FromPort: fromPort,
        ToPort: toPort,
        IpProtocol: ipProtocol,
        ...ipRanges,
      }));
      break;
    }
  }

  return {
    GroupId: params.groupId,
    IpPermissions: ipPermissions,
  };
}

function prepareManageKeyPairsPayload(params) {
  return {
    KeyName: params.KEY_PAIR_NAME,
  };
}

function prepareAllocateAddressPayload(params) {
  return {
    Domain: "vpc",
    Address: params.ADDRESS,
    PublicIpv4Pool: params.PUBLICIPV4POOL,
    DryRun: params.DRYRUN,
  };
}

function prepareAssociateAddressPayload(params) {
  return {
    AllocationId: params.ALLOCATION_ID,
    InstanceId: params.INSTANCE_ID,
    NetworkInterfaceId: params.NETWORK_INTERFACE_ID,
    PrivateIpAddress: params.PRIVATE_IP_ADDRESS,
    DryRun: params.DRYRUN,
  };
}

function prepareReleaseAddressPayload(params) {
  return {
    AllocationId: params.ALLOCATION_ID,
    PublicIp: params.PUBLIC_IP,
    DryRun: params.DRYRUN,
  };
}

function prepareCreateVolumePayload(params) {
  return {
    AvailabilityZone: params.availabilityZone,
    VolumeType: params.volumeType,
    Size: params.size,
    Iops: params.iops,
    SnapshotId: params.snapshotId,
    OutpostArn: params.outpostArn,
    Throughput: params.throughput,
    Encrypted: params.encrypted,
    KmsKeyId: params.kmsKeyId,
    MultiAttachEnabled: params.multiAttachEnabled,
    DryRun: params.dryRun,
  };
}

function prepareCreateSnapshotPayload(params) {
  return {
    VolumeId: params.volumeId,
    Description: params.description,
    OutpostArn: params.outpostArn,
    DryRun: params.dryRun,
  };
}

function prepareCreateTagsPayload(params) {
  const awsFormattedTags = params.tags.map((tag) => {
    if (!tag.includes("=")) {
      throw new Error("Incorect tag's format: missing '='");
    }

    const [key, value] = tag.split("=");
    if (!key) {
      throw new Error("Incorect tag's format: missing key");
    }
    if (!value) {
      throw new Error("Incorect tag's format: missing value");
    }

    return { Key: key, Value: value };
  });

  return {
    Resources: [params.resourceId],
    Tags: awsFormattedTags,
  };
}

module.exports = {
  prepareCreateInstancePayload,
  prepareManageInstancesPayload,
  prepareDescribeInstancesPayload,
  prepareCreateVpcPayload,
  prepareDeleteVpcPayload,
  prepareCreateInternetGatewayPayload,
  prepareAttachInternetGatewayPayload,
  prepareCreateRouteTablePayload,
  prepareCreateRoutePayload,
  prepareCreateNatGatewayPayload,
  prepareAssociateRouteTableToSubnetPayload,
  prepareAssociateRouteTableToGatewayPayload,
  prepareCreateSecurityGroupPayload,
  prepareCreateSubnetPayload,
  prepareDeleteSubnetPayload,
  prepareAddSecurityGroupRulesPayload,
  prepareManageKeyPairsPayload,
  prepareAllocateAddressPayload,
  prepareAssociateAddressPayload,
  prepareReleaseAddressPayload,
  prepareCreateVolumePayload,
  prepareCreateSnapshotPayload,
  prepareCreateTagsPayload,
};
