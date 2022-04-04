const { helpers } = require("kaholo-aws-plugin");
const _ = require("lodash");
const { strToBase64, parseObjectLikeParam } = require("./helpers");
const { AWS_DEFAULT_MAX_RESULTS } = require("./consts.json");

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
    payload.Filters = parseObjectLikeParam(params.filters);
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

function prepareAddSecurityGroupRulesPayload(params) {
  if (params.fromPorts.length !== params.toPorts.length) {
    throw new Error("From Ports and To Ports must be the same length");
  }

  const ipv6Ranges = params.cidrIps6.map((CidrIpv6) => ({
    CidrIpv6,
    Description: params.description,
  }));

  const ipRanges = params.cidrIps.map((CidrIp) => ({
    CidrIp,
    Description: params.description,
  }));

  return helpers.removeUndefinedAndEmpty({
    GroupId: params.groupId,
    IpPermissions: params.fromPorts.map((fromPort, index) => ({
      FromPort: fromPort,
      ToPort: params.toPorts[index],
      IpProtocol: params.ipProtocol,
    })),
    Ipv6Ranges: ipv6Ranges,
    IpRanges: ipRanges,
  });
}

function prepareManageKeyPairsPayload(params) {
  return {
    KeyName: params.KEY_PAIR_NAME,
  };
}

function prepareAllocateAddressPayload(params) {
  return {
    Domain: params.DOMAIN,
    Address: params.ADDRESS,
    PublicIpv4Pool: params.PUBLICIPV4POOL,
    DryRun: params.DRYRUN,
  };
}

function prepareAssociateAddressPayload(params) {
  return {
    AllocationId: params.ALLOCATION_ID,
    InstanceId: params.INSTANCE_ID,
    PublicIp: params.PUBLIC_IP,
    AllowReassociation: params.ALLOW_REASSOCIATION,
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
};
