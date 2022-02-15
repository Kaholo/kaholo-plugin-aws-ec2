const {
  runEc2Func, parseLegacyParam, getPortObj, waitForNatGateway, waitForEc2Resource,
} = require("./helpers");
const parsers = require("./parsers");
const { getInstanceTypes, listRegions } = require("./autocomplete");

async function attachInternetGateway(action, settings) {
  const params = {
    InternetGatewayId: (action.params.gatewayId || "").trim(),
    VpcId: (action.params.vpcId || "").trim(),
    DryRun: action.params.dryRun || false,
  };
  if (!action.params.vpcId || !action.params.gatewayId) {
    throw new Error("You need to provide a Subnet ID or a Gateway ID!");
  }
  return runEc2Func(action, settings, params, "attachInternetGateway");
}

async function createInternetGateway(action, settings) {
  const actionCopy = { ...action };
  const params = {
    DryRun: actionCopy.params.dryRun,
  };
  if (actionCopy.params.tags) {
    params.TagSpecifications = [{ ResourceType: "internet-gateway", Tags: parsers.tags(actionCopy.params.tags) }];
  }
  const vpcId = parsers.string(actionCopy.params.vpcId);
  let result = await runEc2Func(actionCopy, settings, params, "createInternetGateway");
  if (vpcId) {
    actionCopy.params.gatewayId = result.createInternetGateway.InternetGateway.InternetGatewayId;
    result = { ...result, ...(await attachInternetGateway(actionCopy, settings)) };
  }
  return result;
}

async function associateRouteTable(action, settings) {
  const actionCopy = { ...action };
  const params = {
    RouteTableId: (actionCopy.params.routeTableId || "").trim(),
    DryRun: actionCopy.params.dryRun || false,
  };
  if (!params.RouteTableId) {
    throw new Error("Route Table ID was not given!");
  }
  if (!actionCopy.params.subnetId && !actionCopy.params.gatewayId) {
    throw new Error("You need to provide a Subnet ID or a Gateway ID!");
  }
  let result;
  if (actionCopy.params.subnetId) {
    // we need to associate subnet and gateway in seperate functions - otherwise fails...
    const subParams = {
      ...params,
      SubnetId: (actionCopy.params.subnetId || "").trim(),
    };
    result = await runEc2Func(actionCopy, settings, subParams, "associateRouteTable");
  }
  if (actionCopy.params.gatewayId) {
    const subParams = {
      ...params,
      GatewayId: (actionCopy.params.gatewayId || "").trim(),
    };
    if (result) {
      const gatewayResult = await runEc2Func(actionCopy, settings, subParams, "associateRouteTable");
      result = {
        associateRouteTableToSubnet: result.associateRouteTable,
        associateRouteTableToGateway: gatewayResult.associateRouteTable,
      };
    } else {
      result = await runEc2Func(actionCopy, settings, subParams, "associateRouteTable");
    }
  }
  return result;
}

async function createRouteTable(action, settings) {
  const actionCopy = { ...action };
  const params = {
    VpcId: (actionCopy.params.vpcId || "").trim(),
    DryRun: actionCopy.params.dryRun || false,
  };
  if (!params.VpcId) {
    throw new Error("Didn't provide VPC ID!");
  }
  if (actionCopy.params.tags) {
    params.TagSpecifications = [{ ResourceType: "route-table", Tags: parsers.tags(actionCopy.params.tags) }];
  }

  let result = await runEc2Func(actionCopy, settings, params, "createRouteTable");
  if (actionCopy.params.subnetId || actionCopy.params.gatewayId) {
    actionCopy.params.routeTableId = result.createRouteTable.RouteTable.RouteTableId;
    result = { ...result, ...(await associateRouteTable(actionCopy, settings)) };
  }
  return result;
}

async function createInstance(action, settings) {
  const params = {
    ImageId: parsers.string(action.params.IMAGE_ID),
    InstanceType: parsers.string(action.params.INSTANCE_TYPE),
    MinCount: parseInt(action.params.MIN_COUNT || 1, 10),
    MaxCount: parseInt(action.params.MAX_COUNT || 1, 10),
    KeyName: parsers.string(action.params.KEY_NAME),
    SecurityGroupIds: parsers.array(action.params.SECURITY_GROUP_IDS),
    SubnetId: parsers.string(action.params.subnetId),
  };
  const userData = parsers.string(action.params.userData);
  if (userData) {
    const buffer = Buffer.from(userData);
    params.UserData = buffer.toString("base64");
  }
  if (params.MaxCount < params.MinCount) {
    throw new Error("Max Count must be bigger or equal to Min Count");
  }

  if (action.params.TAGS_SPECIFICATION) {
    params.TagSpecifications = [{
      ResourceType: "instance",
      Tags: parseLegacyParam(action.params.TAGS_SPECIFICATION, parsers.tags),
    }];
  }

  return runEc2Func(action, settings, params, "runInstances");
}

async function manageInstances(action, settings) {
  const params = {
    InstanceIds: parseLegacyParam(action.params.INSTANCE_IDS, parsers.array),
  };
  if (params.InstanceIds.length === 0) {
    throw new Error("You must provide at least one Instance ID");
  }
  return runEc2Func(action, settings, params, action.method.name);
}

async function callAwsNoParams(action, settings) {
  return runEc2Func(action, settings, {}, action.method.name);
}

async function manageKeyPairs(action, settings) {
  const params = {
    KeyName: action.params.KEY_PAIR_NAME,
  };
  if (!params.KeyName) {
    throw new Error("Must provide Key Name");
  }
  return runEc2Func(action, settings, params, action.method.name);
}

async function allocateAddress(action, settings) {
  const params = {
    Domain: action.params.DOMAIN,
    Address: action.params.ADDRESS,
    PublicIpv4Pool: action.params.PUBLICIPV4POOL,
    DryRun: action.params.DRYRUN,
  };
  return runEc2Func(action, settings, params, "allocateAddress");
}

async function associateAddress(action, settings) {
  const params = {
    AllocationId: action.params.ALLOCATION_ID,
    InstanceId: action.params.INSTANCE_ID,
    PublicIp: action.params.PUBLIC_IP,
    AllowReassociation: action.params.ALLOWREASSOCIATION,
    DryRun: action.params.DRYRUN,
    NetworkInterfaceId: action.params.NETWORK_INTERFACE_ID,
    PrivateIpAddress: action.params.PRIVATE_IP_ADDRESS,
  };
  return runEc2Func(action, settings, params, "associateAddress");
}

async function releaseAddress(action, settings) {
  const params = {
    AllocationId: action.params.ALLOCATION_ID,
    PublicIp: action.params.PUBLIC_IP,
    DryRun: action.params.DRYRUN,
  };
  return runEc2Func(action, settings, params, "releaseAddress");
}

async function describeInstances(action, settings) {
  const params = {
    DryRun: action.params.DRYRUN,
    MaxResults: action.params.MAX_RESULTS,
    NextToken: action.params.NEXT_TOKEN,
  };
  if (action.params.INSTANCE_IDS) {
    params.InstanceIds = parseLegacyParam(action.params.INSTANCE_IDS, parsers.array);
  }
  if (action.params.filters) {
    if (!Array.isArray(action.params.filters)) {
      throw new Error("Filters ids must be an array");
    }
    params.Filters = action.params.filters;
  }
  return runEc2Func(action, settings, params, "describeInstances");
}

async function createRoute(action, settings) {
  const params = {
    RouteTableId: parsers.string(action.params.routeTableId),
    GatewayId: parsers.string(action.params.gatewayId),
    NatGatewayId: parsers.string(action.params.natGatewayId),
    InstanceId: parsers.string(action.params.instanceId),
    DestinationCidrBlock: parsers.string(action.params.destinationCidrBlock),
    DryRun: action.params.dryRun,
  };
  if (!params.RouteTableId || !params.DestinationCidrBlock) {
    throw new Error("One of the required parameters was not given");
  }
  return runEc2Func(action, settings, params, "createRoute");
}

async function createSecurityGroup(action, settings) {
  const params = {
    GroupName: (action.params.name || "").trim(),
    Description: (action.params.description || "").trim(),
    VpcId: action.params.vpcId,
    DryRun: action.params.dryRun || false,
  };
  if (!params.GroupName || !params.Description) {
    throw new Error("One of the required parameters was not given!");
  }
  if (action.params.tags) {
    params.TagSpecifications = [{ ResourceType: "security-group", Tags: parsers.tags(action.params.tags) }];
  }
  return runEc2Func(action, settings, params, "createSecurityGroup");
}

async function createVpc(action, settings) {
  const actionCopy = { ...action };
  const params = {
    CidrBlock: actionCopy.params.cidrBlock,
    AmazonProvidedIpv6CidrBlock: actionCopy.params.amazonProvidedIpv6CidrBlock || false,
    InstanceTenancy: actionCopy.params.instanceTenancy || "default",
    DryRun: actionCopy.params.dryRun || false,
  };
  if (!params.CidrBlock && !params.AmazonProvidedIpv6CidrBlock) {
    throw new Error("Must provide CIDR Block or select AmazonProvidedIpv6CidrBlock");
  }
  if (actionCopy.params.tags) {
    params.TagSpecifications = [{ ResourceType: "vpc", Tags: parsers.tags(actionCopy.params.tags) }];
  }
  let result = await runEc2Func(actionCopy, settings, params, "createVpc");
  actionCopy.params.vpcId = result.createVpc.Vpc.VpcId; // for later use
  if (actionCopy.params.createInternetGateway) {
    // we use '...' since createInternetGateway can return multiple action results
    result = { ...result, ...(await createInternetGateway(actionCopy, settings)) };
  }
  if (actionCopy.params.createRouteTable) {
    actionCopy.params.gatewayId = undefined;
    result = { ...result, ...(await createRouteTable(actionCopy, settings)) };
    if (actionCopy.params.createInternetGateway) {
      actionCopy.params.routeTableId = result.createRouteTable.RouteTable.RouteTableId;
      actionCopy.params.destinationCidrBlock = "0.0.0.0/0";
      actionCopy.params.gatewayId = result.createInternetGateway.InternetGateway.InternetGatewayId;
      result = { ...result, ...(await createRoute(actionCopy, settings)) };
    }
  }
  if (actionCopy.params.createSecurityGroup) {
    actionCopy.params.name = `${actionCopy.params.vpcId}-dedicated-security-group`;
    actionCopy.params.description = `A security group dedicated only for ${actionCopy.params.vpcId}`;
    result = { ...result, ...(await createSecurityGroup(actionCopy, settings)) };
  }
  return result;
}

async function createNatGateway(action, settings) {
  const params = {
    SubnetId: (action.params.subnetId || "").trim(),
    AllocationId: action.params.allocationId,
    DryRun: action.params.dryRun || false,
  };
  if (!params.SubnetId) {
    throw new Error("One of the required parameters was not given!");
  }
  if (action.params.tags) {
    params.TagSpecifications = [{ ResourceType: "natgateway", Tags: parsers.tags(action.params.tags) }];
  }
  return runEc2Func(action, settings, params, "createNatGateway");
}

async function createSubnet(action, settings) {
  const actionCopy = { ...action };
  const params = {
    AvailabilityZone: parsers.string(actionCopy.params.availabilityZone),
    CidrBlock: parsers.string(actionCopy.params.cidrBlock),
    Ipv6CidrBlock: parsers.string(actionCopy.params.ipv6CidrBlock),
    VpcId: parsers.string(actionCopy.params.vpcId),
    OutpostArn: parsers.string(actionCopy.params.outpostArn),
    DryRun: actionCopy.params.dryRun || false,
  };
  if (!(params.CidrBlock || params.Ipv6CidrBlock)) {
    throw new Error("Must provide CIDR Block or IPv6 CIDR Block");
  }
  if (actionCopy.params.tags) {
    params.TagSpecifications = [{ ResourceType: "subnet", Tags: parsers.tags(actionCopy.params.tags) }];
  }

  let result = await runEc2Func(actionCopy, settings, params, "createSubnet");
  actionCopy.params.subnetId = result.createSubnet.Subnet.SubnetId;

  if (actionCopy.params.allocationId) { // indicates that nat gateway is needed
    result = { ...result, ...(await createNatGateway(actionCopy, settings)) };
  }
  if (actionCopy.params.routeTableId) {
    result = { ...result, ...(await associateRouteTable(actionCopy, settings)) };
  } else if (actionCopy.params.createPrivateRouteTable) {
    result = { ...result, ...(await createRouteTable(actionCopy, settings)) };
    if (result.createNatGateway) {
      // if nat gateway also was created, connect to correct route
      actionCopy.params.routeTableId = result.createRouteTable.RouteTable.RouteTableId;
      actionCopy.params.natGatewayId = result.createNatGateway.NatGateway.NatGatewayId;
      actionCopy.params.destinationCidrBlock = "0.0.0.0/0";
      // wait for nat gateway to be available than create route
      await waitForNatGateway(actionCopy, settings);
      result = { ...result, ...(await createRoute(actionCopy, settings)) };
    }
  }
  if (actionCopy.params.mapPublicIpOnLaunch) {
    const chagneAttrParams = {
      SubnetId: actionCopy.params.subnetId,
      MapPublicIpOnLaunch: { Value: true },
    };
    result = { ...result, ...(await runEc2Func(actionCopy, settings, chagneAttrParams, "modifySubnetAttribute")) };
  }
  return result;
}

async function deleteVpc(action, settings) {
  const params = {
    VpcId: action.params.vpcId,
    DryRun: action.params.dryRun,
  };
  return runEc2Func(action, settings, params, "deleteVpc");
}

async function deleteSubnet(action, settings) {
  const params = {
    SubnetId: action.params.subnetId,
    DryRun: action.params.dryRun,
  };
  return runEc2Func(action, settings, params, "deleteSubnet");
}

async function modifyInstanceType(action, settings) {
  const instanceIds = parsers.array(action.params.instanceIds);
  const instanceType = { Value: parsers.autocomplete(action.params.instanceType) };
  if (!instanceType.Value || !instanceIds || !instanceIds.length) {
    throw new Error("Didn't provide one of the required fields");
  }
  return Promise.all(instanceIds.map((instanceId) => {
    const params = {
      InstanceId: instanceId,
      InstanceType: instanceType,
    };
    return runEc2Func(action, settings, params, "modifyInstanceAttribute", true);
  }));
}

async function addSecurityGroupRules(action, settings) {
  const actionCopy = { ...action };
  const arrays = ["cidrIps", "cidrIps6", "fromPorts", "toPorts"];
  arrays.forEach((arrayName) => {
    actionCopy.params[arrayName] = parsers.array((actionCopy.params[arrayName]));
  });
  const {
    cidrIps, cidrIps6, fromPorts, toPorts, ipProtocol, description, ruleType,
  } = actionCopy.params;
  if (fromPorts.length === 0 || toPorts.length === 0) {
    throw new Error("Must provide from and to ports!");
  }
  if (fromPorts.length !== toPorts.length) {
    throw new Error("From Ports and To Ports must be the same length");
  }

  const params = {
    GroupId: parsers.string(actionCopy.params.groupId),
    IpPermissions: fromPorts.map((fromPort, index) => getPortObj(
      fromPort,
      toPorts[index],
      ipProtocol,
      cidrIps,
      cidrIps6,
      description,
    )),
  };
  if (!params.GroupId) {
    throw new Error("Must provide Group ID");
  }

  let funcName;
  switch (ruleType) {
    case "Egress-Authorize":
      funcName = "authorizeSecurityGroupEgress";
      break;
    case "Ingress-Revoke":
      funcName = "revokeSecurityGroupIngress";
      break;
    case "Egress-Revoke":
      funcName = "revokeSecurityGroupEgress";
      break;
    default:
      funcName = "authorizeSecurityGroupIngress";
  }

  return runEc2Func(actionCopy, settings, params, funcName);
}

async function createVolume(action, settings) {
  const params = {
    AvailabilityZone: parsers.string(action.params.availabilityZone),
    VolumeType: action.params.volumeType,
    Size: parsers.number(action.params.size),
    Iops: parsers.number(action.params.iops),
    SnapshotId: parsers.string(action.params.snapshotId),
    OutpostArn: parsers.string(action.params.outpostArn),
    Throughput: parsers.number(action.params.throughput),
    Encrypted: parsers.boolean(action.params.encrypted),
    KmsKeyId: parsers.string(action.params.kmsKeyId),
    MultiAttachEnabled: parsers.boolean(action.params.multiAttachEnabled),
    DryRun: parsers.boolean(action.params.dryRun),
  };
  if ((!params.AvailabilityZone && !params.OutpostArn) || !params.VolumeType) {
    throw new Error("One of the required parameters was not given");
  }
  let result = await runEc2Func(action, settings, params, "createVolume");
  if (!action.params.waitForEnd) {
    return result;
  }
  result = await waitForEc2Resource(action, "volumeAvailable", { VolumeIds: [result.createVolume.VolumeId] });
  return { createVolume: result.Volumes[0] };
}

async function createSnapshot(action, settings) {
  const params = {
    VolumeId: parsers.string(action.params.volumeId),
    Description: parsers.string(action.params.description),
    OutpostArn: parsers.string(action.params.outpostArn),
    DryRun: parsers.boolean(action.params.dryRun),
  };
  if (!params.VolumeId) {
    throw new Error("Must provide volume ID to create the snapshot of!");
  }
  let result = await runEc2Func(action, settings, params, "createSnapshot");
  if (!action.params.waitForEnd) {
    return result;
  }
  result = await waitForEc2Resource(action, "snapshotCompleted", { SnapshotIds: [result.createSnapshot.SnapshotId] });
  return { createSnapshot: result.Snapshots[0] };
}

async function modifyInstanceAttribute(action, settings) {
  const instanceIds = parsers.array(action.params.instanceIds);
  return Promise.all(instanceIds.map((instanceId) => {
    const params = {
      InstanceId: instanceId,
      DryRun: parsers.boolean(action.params.dryRun),
    };

    params[action.params.attribute] = {};
    params[action.params.attribute].Value = parsers.string(action.params.attributeValue);

    return runEc2Func(action, settings, params, "modifyInstanceAttribute");
  }));
}

module.exports = {
  createInstance,
  startInstances: manageInstances,
  stopInstances: manageInstances,
  rebootInstances: manageInstances,
  describeKeyPairs: callAwsNoParams,
  createKeyPair: manageKeyPairs,
  deleteKeyPair: manageKeyPairs,
  allocateAddress,
  associateAddress,
  releaseAddress,
  describeInstances,
  terminateInstances: manageInstances,
  createVpc,
  createSubnet,
  deleteSubnet,
  deleteVpc,
  modifyInstanceType,
  createInternetGateway,
  createRouteTable,
  createNatGateway,
  createSecurityGroup,
  associateRouteTable,
  attachInternetGateway,
  addSecurityGroupRules,
  createRoute,
  createVolume,
  createSnapshot,
  // auto complete
  getInstanceTypes,
  listRegions,
  modifyInstanceAttribute,
};
