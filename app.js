const _ = require("lodash");
const awsPluginLibrary = require("@kaholo/aws-plugin-library");
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
  DescribeSnapshotsCommand,
  DescribeVolumesCommand,
} = require("@aws-sdk/client-ec2");

const {
  getInstanceTypes,
  listRegions,
  listSubnets,
} = require("./autocomplete");

const {
  parseInstanceAttributeValue,
  resolveSecurityGroupCommand,
} = require("./helpers");

const payloadFuncs = require("./payload-functions");

const simpleAwsFunctions = {
  startInstances: awsPluginLibrary.generateAwsMethod(
    StartInstancesCommand,
    payloadFuncs.prepareManageInstancesPayload,
  ),
  rebootInstances: awsPluginLibrary.generateAwsMethod(
    RebootInstancesCommand,
    payloadFuncs.prepareManageInstancesPayload,
  ),
  terminateInstances: awsPluginLibrary.generateAwsMethod(
    TerminateInstancesCommand,
    payloadFuncs.prepareManageInstancesPayload,
  ),
  createNatGateway: awsPluginLibrary.generateAwsMethod(
    CreateNatGatewayCommand,
    payloadFuncs.prepareCreateNatGatewayPayload,
  ),
  createRoute: awsPluginLibrary.generateAwsMethod(
    CreateRouteCommand,
    payloadFuncs.prepareCreateRoutePayload,
  ),
  modifySubnetAttribute: awsPluginLibrary.generateAwsMethod(ModifySubnetAttributeCommand),
  attachInternetGateway: awsPluginLibrary.generateAwsMethod(
    AttachInternetGatewayCommand,
    payloadFuncs.prepareAttachInternetGatewayPayload,
  ),
  createKeyPair: awsPluginLibrary.generateAwsMethod(
    CreateKeyPairCommand,
    payloadFuncs.prepareManageKeyPairsPayload,
  ),
  deleteKeyPair: awsPluginLibrary.generateAwsMethod(
    DeleteKeyPairCommand,
    payloadFuncs.prepareManageKeyPairsPayload,
  ),
  describeKeyPairs: awsPluginLibrary.generateAwsMethod(DescribeKeyPairsCommand),
  allocateAddress: awsPluginLibrary.generateAwsMethod(
    AllocateAddressCommand,
    payloadFuncs.prepareAllocateAddressPayload,
  ),
  associateAddress: awsPluginLibrary.generateAwsMethod(
    AssociateAddressCommand,
    payloadFuncs.prepareAssociateAddressPayload,
  ),
  releaseAddress: awsPluginLibrary.generateAwsMethod(
    ReleaseAddressCommand,
    payloadFuncs.prepareReleaseAddressPayload,
  ),
  deleteVpc: awsPluginLibrary.generateAwsMethod(
    DeleteVpcCommand,
    payloadFuncs.prepareDeleteVpcPayload,
  ),
  deleteSubnet: awsPluginLibrary.generateAwsMethod(
    DeleteSubnetCommand,
    payloadFuncs.prepareDeleteSubnetPayload,
  ),
};

async function createTags(client, params, region) {
  const awsCreateTags = awsPluginLibrary.generateAwsMethod(
    CreateTagsCommand,
    payloadFuncs.prepareCreateTagsPayload,
  );
  await awsCreateTags(client, params, region);

  const awsDescribeTags = awsPluginLibrary.generateAwsMethod(
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
  const awsCreateInstance = awsPluginLibrary.generateAwsMethod(
    RunInstancesCommand,
    payloadFuncs.prepareCreateInstancePayload,
  );

  if (!params.rootVolumeSize) {
    return awsCreateInstance(client, params, region);
  }

  const awsDescribeImages = awsPluginLibrary.generateAwsMethod(
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
  const awsCreateSecurityGroup = awsPluginLibrary.generateAwsMethod(
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
  const awsStopInstances = awsPluginLibrary.generateAwsMethod(
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
  const awsDescribeInstances = awsPluginLibrary.generateAwsMethod(
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

    return client.send(new ModifyInstanceAttributeCommand(payload));
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
  const awsAssociateRouteTableToSubnet = awsPluginLibrary.generateAwsMethod(
    AssociateRouteTableCommand,
    payloadFuncs.prepareAssociateRouteTableToSubnetPayload,
  );
  const awsAssociateRouteTableToGateway = awsPluginLibrary.generateAwsMethod(
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
  const awsCreateInternetGateway = awsPluginLibrary.generateAwsMethod(
    CreateInternetGatewayCommand,
    payloadFuncs.prepareCreateInternetGatewayPayload,
  );
  const result = await awsCreateInternetGateway(client, params, region);

  if (!params.vpcId) {
    return result;
  }

  const attachInternetGatewayParams = {
    ...params,
    gatewayId: result.InternetGateway.InternetGatewayId,
  };

  const attachInternetGateway = await simpleAwsFunctions.attachInternetGateway(
    client,
    attachInternetGatewayParams,
    region,
  );

  return _.merge(result, { attachInternetGateway });
}

async function createRouteTableWorkflow(client, params, region) {
  const awsCreateRouteTable = awsPluginLibrary.generateAwsMethod(
    CreateRouteTableCommand,
    payloadFuncs.prepareCreateRouteTablePayload,
  );
  const result = await awsCreateRouteTable(client, params, region);

  if (!params.subnetId && !params.gatewayId) {
    return result;
  }

  const associateRouteTableParams = {
    ...params,
    routeTableId: result.RouteTable.RouteTableId,
  };
  const routeTableResult = await associateRouteTable(client, associateRouteTableParams, region);

  return _.merge(result, { associateRouteTable: routeTableResult });
}

async function createVpcWorkflow(client, params, region) {
  const awsCreateVpc = awsPluginLibrary.generateAwsMethod(
    CreateVpcCommand,
    payloadFuncs.prepareCreateVpcPayload,
  );
  let result = await awsCreateVpc(client, params, region);

  const additionalParams = {
    vpcId: result.Vpc.VpcId,
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
  const awsCreateSubnet = awsPluginLibrary.generateAwsMethod(
    CreateSubnetCommand,
    payloadFuncs.prepareCreateSubnetPayload,
  );
  let result = await awsCreateSubnet(client, params, region);

  const additionalParams = {
    SubnetId: result.Subnet.SubnetId,
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
        NatGatewayIds: [result.NatGateway.NatGatewayId],
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
  const awsCreateVolume = awsPluginLibrary.generateAwsMethod(
    CreateVolumeCommand,
    payloadFuncs.prepareCreateVolumePayload,
  );
  const result = await awsCreateVolume(client, params, region);

  if (!params.waitForEnd) {
    return result;
  }

  const volumeId = result.VolumeId;
  await waitUntilVolumeAvailable({ client }, {
    VolumeIds: [volumeId],
  });

  const describeVolumesResult = await client.send(new DescribeVolumesCommand({
    VolumeIds: [volumeId],
  }));

  return { createVolume: describeVolumesResult.Volumes[0] };
}

async function createSnapshot(client, params, region) {
  const awsCreateSnapshot = awsPluginLibrary.generateAwsMethod(
    CreateSnapshotCommand,
    payloadFuncs.prepareCreateSnapshotPayload,
  );
  const result = await awsCreateSnapshot(client, params, region);

  if (!params.waitForEnd) {
    return result;
  }

  const snapshotId = result.SnapshotId;

  await waitUntilSnapshotCompleted({ client }, {
    SnapshotIds: [snapshotId],
  });

  const describeSnapshotsResult = await client.send(new DescribeSnapshotsCommand({
    SnapshotIds: [snapshotId],
  }));

  return { createSnapshot: describeSnapshotsResult.Snapshots[0] };
}

async function addSecurityGroupRules(client, params) {
  const awsSecurityMethod = awsPluginLibrary.generateAwsMethod(
    resolveSecurityGroupCommand(params.ruleType),
    payloadFuncs.prepareAddSecurityGroupRulesPayload,
  );

  return awsSecurityMethod(client, params);
}

module.exports = awsPluginLibrary.bootstrap(
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
