const _ = require("lodash");
const awsPlugin = require("@kaholo/aws-plugin-library");
const {
  EC2,
  StartInstancesCommand,
  RebootInstancesCommand,
  TerminateInstancesCommand,
  CreateNatGatewayCommand,
  CreateRouteCommand,
  ModifySubnetAttributeCommand,
  AttachInternetGatewayCommand,
  CreateKeyPairCommand,
  DeleteKeyPairCommand,
  DescribeKeyPairsCommand,
  AllocateAddressCommand,
  AssociateAddressCommand,
  ReleaseAddressCommand,
  DeleteVpcCommand,
  DeleteSubnetCommand,
  CreateTagsCommand,
  DescribeTagsCommand,
  RunInstancesCommand,
  DescribeImagesCommand,
  CreateSecurityGroupCommand,
  StopInstancesCommand,
  DescribeInstancesCommand,
  AssociateRouteTableCommand,
  CreateInternetGatewayCommand,
  CreateRouteTableCommand,
  CreateVpcCommand,
  CreateSubnetCommand,
  CreateVolumeCommand,
  CreateSnapshotCommand,
  DescribeSecurityGroupRulesCommand,
  RevokeSecurityGroupEgressCommand,
  ModifyInstanceAttributeCommand,
  waitUntilInstanceStopped,
  waitUntilNatGatewayAvailable,
  waitUntilVolumeAvailable,
  waitUntilSnapshotCompleted,
} = require("@aws-sdk/client-ec2");

const {
  getInstanceTypes,
  listRegions,
  listSubnets,
} = require("./autocomplete");

const {
  resolveSecurityGroupFunction,
  parseInstanceAttributeValue,
} = require("./helpers");

const payloadFuncs = require("./payload-functions");

const simpleAwsFunctions = {
  startInstances: awsPlugin.generateAwsMethod(
    StartInstancesCommand,
    payloadFuncs.prepareManageInstancesPayload,
  ),
  rebootInstances: awsPlugin.generateAwsMethod(
    RebootInstancesCommand,
    payloadFuncs.prepareManageInstancesPayload,
  ),
  terminateInstances: awsPlugin.generateAwsMethod(
    TerminateInstancesCommand,
    payloadFuncs.prepareManageInstancesPayload,
  ),
  createNatGateway: awsPlugin.generateAwsMethod(
    CreateNatGatewayCommand,
    payloadFuncs.prepareCreateNatGatewayPayload,
  ),
  createRoute: awsPlugin.generateAwsMethod(
    CreateRouteCommand,
    payloadFuncs.prepareCreateRoutePayload,
  ),
  modifySubnetAttribute: awsPlugin.generateAwsMethod(ModifySubnetAttributeCommand),
  attachInternetGateway: awsPlugin.generateAwsMethod(
    AttachInternetGatewayCommand,
    payloadFuncs.prepareAttachInternetGatewayPayload,
  ),
  createKeyPair: awsPlugin.generateAwsMethod(
    CreateKeyPairCommand,
    payloadFuncs.prepareManageKeyPairsPayload,
  ),
  deleteKeyPair: awsPlugin.generateAwsMethod(
    DeleteKeyPairCommand,
    payloadFuncs.prepareManageKeyPairsPayload,
  ),
  describeKeyPairs: awsPlugin.generateAwsMethod(DescribeKeyPairsCommand),
  allocateAddress: awsPlugin.generateAwsMethod(
    AllocateAddressCommand,
    payloadFuncs.prepareAllocateAddressPayload,
  ),
  associateAddress: awsPlugin.generateAwsMethod(
    AssociateAddressCommand,
    payloadFuncs.prepareAssociateAddressPayload,
  ),
  releaseAddress: awsPlugin.generateAwsMethod(
    ReleaseAddressCommand,
    payloadFuncs.prepareReleaseAddressPayload,
  ),
  deleteVpc: awsPlugin.generateAwsMethod(DeleteVpcCommand, payloadFuncs.prepareDeleteVpcPayload),
  deleteSubnet: awsPlugin.generateAwsMethod(
    DeleteSubnetCommand,
    payloadFuncs.prepareDeleteSubnetPayload,
  ),
};

async function createTags(client, params, region) {
  const awsCreateTags = awsPlugin.generateAwsMethod(
    CreateTagsCommand,
    payloadFuncs.prepareCreateTagsPayload,
  );
  await awsCreateTags(client, params, region);

  const awsDescribeTags = awsPlugin.generateAwsMethod(
    DescribeTagsCommand,
    (describeTagsParams) => ({
      Filters: [
        {
          Name: "resource-id",
          Values: [describeTagsParams.resourceId],
        },
      ],
    }),
  );
  return awsDescribeTags(client, params, region);
}

async function createInstance(client, params, region) {
  const awsCreateInstance = awsPlugin.generateAwsMethod(
    RunInstancesCommand,
    payloadFuncs.prepareCreateInstancePayload,
  );

  if (!params.rootVolumeSize) {
    return awsCreateInstance(client, params, region);
  }

  const awsDescribeImages = awsPlugin.generateAwsMethod(
    DescribeImagesCommand,
    (describeImagesParams) => ({
      ImageIds: [describeImagesParams.IMAGE_ID],
    }),
  );

  const describeImagesResult = await awsDescribeImages(client, params, region);
  const {
    RootDeviceName: rootDeviceName,
  } = describeImagesResult.Images[0];

  return awsCreateInstance(
    client,
    {
      ...params,
      rootDeviceName,
    },
    region,
  );
}

async function createSecurityGroup(client, params, region) {
  const awsCreateSecurityGroup = awsPlugin.generateAwsMethod(
    CreateSecurityGroupCommand,
    payloadFuncs.prepareCreateSecurityGroupPayload,
  );
  const securityGroup = await awsCreateSecurityGroup(client, params, region);

  if (!params.disallowOutboundTraffic) {
    return securityGroup;
  }

  // Get security group rules
  const { SecurityGroupRules: groupRules } = await client.send(
    new DescribeSecurityGroupRulesCommand({
      Filters: [{
        Name: "group-id",
        Values: [securityGroup.GroupId],
      }],
    }),
  );

  // Filter out the egress rules and map the ids
  const groupRuleIds = groupRules
    .filter((rule) => rule.IsEgress)
    .map((rule) => rule.SecurityGroupRuleId);

  // Revoke the rules
  await client.send(new RevokeSecurityGroupEgressCommand({
    GroupId: securityGroup.GroupId,
    SecurityGroupRuleIds: groupRuleIds,
  }));

  return securityGroup;
}

async function stopInstances(client, params, region) {
  const awsStopInstances = awsPlugin.generateAwsMethod(
    StopInstancesCommand,
    payloadFuncs.prepareManageInstancesPayload,
  );
  const stopResult = await awsStopInstances(client, params, region);

  if (!params.WAIT_FOR_STOP) {
    return stopResult;
  }

  const waitResult = await waitUntilInstanceStopped({ client }, {
    InstanceIds: params.INSTANCE_IDS,
  });

  console.info("CurrentState is stopped for all instances.");
  return waitResult;
}

async function describeInstances(client, params, region) {
  const awsDescribeInstances = awsPlugin.generateAwsMethod(
    DescribeInstancesCommand,
    payloadFuncs.prepareDescribeInstancesPayload,
  );

  const getAllInstancesHelper = async (nextToken) => {
    const result = await awsDescribeInstances(client, { ...params, nextToken }, region);
    if (result.NextToken && params.GET_ALL_RECURSIVELY) {
      const recursiveResult = await getAllInstancesHelper(result.NextToken);
      return [...result.Reservations, ...recursiveResult];
    }
    return result.Reservations;
  };

  const recursiveReservations = await getAllInstancesHelper();

  return {
    Reservations: recursiveReservations,
  };
}

async function modifyInstanceType(client, params) {
  return Promise.all(params.instanceIds.map((instanceId) => {
    const payload = {
      InstanceId: instanceId,
      InstanceType: { Value: params.instanceType },
    };
    return client.send(new ModifySubnetAttributeCommand(payload));
  }));
}

async function modifyInstanceAttribute(client, params) {
  return Promise.all(params.instanceIds.map((instanceId) => {
    const payload = {
      InstanceId: instanceId,
      DryRun: params.dryRun,
      [params.attribute]: {
        Value: parseInstanceAttributeValue(params.attribute, params.attributeValue),
      },
    };

    return client.send(new ModifyInstanceAttributeCommand(payload));
  }));
}

async function associateRouteTable(client, params, region) {
  const awsAssociateRouteTableToSubnet = awsPlugin.generateAwsMethod(
    AssociateRouteTableCommand,
    payloadFuncs.prepareAssociateRouteTableToSubnetPayload,
  );
  const awsAssociateRouteTableToGateway = awsPlugin.generateAwsMethod(
    AssociateRouteTableCommand,
    payloadFuncs.prepareAssociateRouteTableToGatewayPayload,
  );

  let result = {};

  if (params.subnetId) {
    const {
      associateRouteTable: associateRouteTableToSubnet,
    } = await awsAssociateRouteTableToSubnet(client, params, region);

    result = _.merge(result, { associateRouteTableToSubnet });
  }

  if (params.gatewayId) {
    const {
      associateRouteTable: associateRouteTableToGateway,
    } = await awsAssociateRouteTableToGateway(client, params, region);

    result = _.merge(result, { associateRouteTableToGateway });
  }

  return result;
}

async function createInternetGatewayWorkflow(client, params, region) {
  const awsCreateInternetGateway = awsPlugin.generateAwsMethod(
    CreateInternetGatewayCommand,
    payloadFuncs.prepareCreateInternetGatewayPayload,
  );
  const result = { createInternetGateway: await awsCreateInternetGateway(client, params, region) };

  if (!params.vpcId) {
    return result;
  }

  const attachInternetGatewayParams = {
    ...params,
    gatewayId: result.createInternetGateway.InternetGateway.InternetGatewayId,
  };

  const attachInternetGateway = await simpleAwsFunctions.attachInternetGateway(
    client,
    attachInternetGatewayParams,
    region,
  );

  return _.merge(result, { attachInternetGateway });
}

async function createRouteTableWorkflow(client, params, region) {
  const awsCreateRouteTable = awsPlugin.generateAwsMethod(
    CreateRouteTableCommand,
    payloadFuncs.prepareCreateRouteTablePayload,
  );
  const result = { createRouteTable: await awsCreateRouteTable(client, params, region) };

  if (!params.subnetId && !params.gatewayId) {
    return result;
  }

  const associateRouteTableParams = {
    ...params,
    routeTableId: result.createRouteTable.RouteTable.RouteTableId,
  };
  const routeTableResult = await associateRouteTable(client, associateRouteTableParams, region);

  return _.merge(result, { associateRouteTable: routeTableResult });
}

async function createVpcWorkflow(client, params, region) {
  const awsCreateVpc = awsPlugin.generateAwsMethod(
    CreateVpcCommand,
    payloadFuncs.prepareCreateVpcPayload,
  );
  let result = { createVpc: await awsCreateVpc(client, params, region) };

  const additionalParams = {
    vpcId: result.createVpc.Vpc.VpcId,
  };

  if (params.createInternetGateway) {
    const createInternetGatewayParams = {
      ...params,
      ...additionalParams,
    };
    result = _.merge(
      result,
      await createInternetGatewayWorkflow(client, createInternetGatewayParams, region),
    );
  }

  if (params.createRouteTable) {
    const createRouteTableParams = {
      ...params,
      ...additionalParams,
    };

    result = _.merge(
      result,
      createRouteTableWorkflow(client, createRouteTableParams, region),
    );

    if (params.createInternetGateway) {
      const createRouteParams = {
        ...params,
        RouteTableId: additionalParams.createRouteTable.RouteTable.RouteTableId,
        DestinationCidrBlock: "0.0.0.0/0",
        GatewayId: additionalParams.createInternetGateway.InternetGateway.InternetGatewayId,
      };

      result = _.merge(
        result,
        { createRoute: await simpleAwsFunctions.createRoute(client, createRouteParams, region) },
      );
    }
  }

  if (params.createSecurityGroup) {
    const createSecurityGroupParams = {
      ...params,
      ...additionalParams,
      GroupName: `${additionalParams.vpcId}-dedicated-security-group`,
      Description: `A security group dedicated only for ${additionalParams.vpcId}`,
    };

    result = _.merge(
      result,
      {
        createSecurityGroup:
          await simpleAwsFunctions.createSecurityGroup(client, createSecurityGroupParams, region),
      },
    );
  }

  return result;
}

async function createSubnetWorkflow(client, params, region) {
  const awsCreateSubnet = awsPlugin.generateAwsMethod(
    CreateSubnetCommand,
    payloadFuncs.prepareCreateSubnetPayload,
  );
  let result = { createSubnet: await awsCreateSubnet(client, params, region) };

  const additionalParams = {
    SubnetId: result.createSubnet.Subnet.SubnetId,
  };

  if (params.allocationId) {
    const createNatGatewayParams = {
      ...params,
      ...additionalParams,
    };
    result = _.merge(
      result,
      {
        createNatGateway:
          await simpleAwsFunctions.createNatGateway(client, createNatGatewayParams, region),
      },
    );
  }

  if (params.routeTableId) {
    const associateRouteTableParams = {
      ...params,
      ...additionalParams,
    };

    result = _.merge(
      result,
      { associateRouteTable: await associateRouteTable(client, associateRouteTableParams, region) },
    );
  } else if (params.createPrivateRouteTable) {
    const createRouteTableParams = {
      ...params,
      ...additionalParams,
    };

    result = _.merge(
      result,
      await createRouteTableWorkflow(client, createRouteTableParams, region),
    );

    if (result.createNatGateway) {
      await waitUntilNatGatewayAvailable({ client }, {
        NatGatewayIds: [result.createNatGateway.NatGateway.NatGatewayId],
      });

      const createRouteParams = {
        ...params,
        SubnetId: additionalParams.SubnetId,
        RouteTableId: additionalParams.createRouteTable.RouteTable.RouteTableId,
        NatGatewayId: additionalParams.createNatGateway.NatGateway.NatGatewayId,
        DestinationCidrBlock: "0.0.0.0/0",
      };

      result = _.merge(
        result,
        { createRoute: await simpleAwsFunctions.createRoute(client, createRouteParams, region) },
      );
    }
  }

  if (params.mapPublicIpOnLaunch) {
    const modifySubnetAttributeParams = {
      ...additionalParams,
      MapPublicIpOnLaunch: { Value: true },
    };

    result = _.merge(
      result,
      {
        modifySubnetAttribute:
          await simpleAwsFunctions.modifySubnetAttribute(
            client,
            modifySubnetAttributeParams,
            region,
          ),
      },
    );
  }

  return result;
}

async function createVolume(client, params, region) {
  const awsCreateVolume = awsPlugin.generateAwsMethod(
    CreateVolumeCommand,
    payloadFuncs.prepareCreateVolumePayload,
  );
  let result = { createVolume: await awsCreateVolume(client, params, region) };

  if (!params.waitForEnd) {
    return result;
  }

  result = await waitUntilVolumeAvailable({ client }, {
    VolumeIds: [result.createVolume.VolumeId],
  });

  return { createVolume: result.Volumes[0] };
}

async function createSnapshot(client, params, region) {
  const awsCreateSnapshot = awsPlugin.generateAwsMethod(
    CreateSnapshotCommand,
    payloadFuncs.prepareCreateSnapshotPayload,
  );
  let result = { createSnapshot: await awsCreateSnapshot(client, params, region) };

  if (!params.waitForEnd) {
    return result;
  }

  result = await waitUntilSnapshotCompleted({ client }, {
    SnapshotIds: [result.createSnapshot.SnapshotId],
  });

  return { createSnapshot: result.Snapshots[0] };
}

async function addSecurityGroupRules(client, params) {
  const payload = payloadFuncs.prepareAddSecurityGroupRulesPayload(params);
  const funcName = resolveSecurityGroupFunction(params.ruleType);

  return client[funcName](payload).promise();
}

module.exports = awsPlugin.bootstrap(
  EC2,
  {
    ...simpleAwsFunctions,
    modifyInstanceType,
    modifyInstanceAttribute,
    createInstance,
    createVpc: createVpcWorkflow,
    createSubnet: createSubnetWorkflow,
    createInternetGateway: createInternetGatewayWorkflow,
    createRouteTable: createRouteTableWorkflow,
    createTags,
    associateRouteTable,
    createVolume,
    createSnapshot,
    addSecurityGroupRules,
    describeInstances,
    createSecurityGroup,
    stopInstances,
  },
  {
    getInstanceTypes,
    listRegions,
    listSubnets,
  },
  {
    ACCESS_KEY: "accessKeyId",
    SECRET_KEY: "secretAccessKey",
    REGION: "region",
  },
);
