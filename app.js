const _ = require("lodash");
const aws = require("aws-sdk");
const awsPlugin = require("kaholo-aws-plugin");
const { resolveSecurityGroupFunction } = require("./helpers");
const { getInstanceTypes, listRegions, listSubnets } = require("./autocomplete");
const payloadFuncs = require("./payload-functions");

const simpleAwsFunctions = {
  createInstance: awsPlugin.generateAwsMethod("runInstances", payloadFuncs.prepareCreateInstancePayload),
  startInstances: awsPlugin.generateAwsMethod("startInstances", payloadFuncs.prepareManageInstancesPayload),
  rebootInstances: awsPlugin.generateAwsMethod("rebootInstances", payloadFuncs.prepareManageInstancesPayload),
  terminateInstances: awsPlugin.generateAwsMethod("terminateInstances", payloadFuncs.prepareManageInstancesPayload),
  createNatGateway: awsPlugin.generateAwsMethod("createNatGateway", payloadFuncs.prepareCreateNatGatewayPayload),
  createRoute: awsPlugin.generateAwsMethod("createRoute", payloadFuncs.prepareCreateRoutePayload),
  modifySubnetAttribute: awsPlugin.generateAwsMethod("modifySubnetAttribute"),
  attachInternetGateway: awsPlugin.generateAwsMethod("attachInternetGateway", payloadFuncs.prepareAttachInternetGatewayPayload),
  createKeyPair: awsPlugin.generateAwsMethod("createKeyPair", payloadFuncs.prepareManageKeyPairsPayload),
  deleteKeyPair: awsPlugin.generateAwsMethod("deleteKeyPair", payloadFuncs.prepareManageKeyPairsPayload),
  describeKeyPairs: awsPlugin.generateAwsMethod("describeKeyPairs"),
  allocateAddress: awsPlugin.generateAwsMethod("allocateAddress", payloadFuncs.prepareAllocateAddressPayload),
  associateAddress: awsPlugin.generateAwsMethod("associateAddress", payloadFuncs.prepareAssociateAddressPayload),
  releaseAddress: awsPlugin.generateAwsMethod("releaseAddress", payloadFuncs.prepareReleaseAddressPayload),
  deleteVpc: awsPlugin.generateAwsMethod("deleteVpc", payloadFuncs.prepareDeleteVpcPayload),
  deleteSubnet: awsPlugin.generateAwsMethod("deleteSubnet", payloadFuncs.prepareDeleteSubnetPayload),
  createTags: awsPlugin.generateAwsMethod("createTags", payloadFuncs.prepareCreateTagsPayload),
};

async function createSecurityGroup(client, params, region) {
  const awsCreateSecurityGroup = awsPlugin.generateAwsMethod("createSecurityGroup", payloadFuncs.prepareCreateSecurityGroupPayload);
  const securityGroup = await awsCreateSecurityGroup(client, params, region);
  if (params.disallowOutboundTraffic) {
    // Get security group rules
    const { SecurityGroupRules: groupRules } = await client.describeSecurityGroupRules({
      Filters: [{
        Name: "group-id",
        Values: [securityGroup.GroupId],
      }],
    }).promise();
    // Filter out the egress rules and map the ids
    const groupRuleIds = groupRules
      .filter((rule) => rule.IsEgress)
      .map((rule) => rule.SecurityGroupRuleId);
    // Revoke the rules
    await client.revokeSecurityGroupEgress({
      GroupId: securityGroup.GroupId,
      SecurityGroupRuleIds: groupRuleIds,
    }).promise();
  }
  return securityGroup;
}

async function stopInstances(client, params, region) {
  const awsStopInstances = awsPlugin.generateAwsMethod("stopInstances", payloadFuncs.prepareManageInstancesPayload);
  const stopResult = await awsStopInstances(client, params, region);
  if (params.WAIT_FOR_STOP) {
    const waitResult = await client.waitFor("instanceStopped", { InstanceIds: params.INSTANCE_IDS }).promise();
    // TODO:
    // Currently only console.error is able to log messages in
    // the Activity Log, console.info should be used here instead
    console.error("CurrentState is stopped for all instances.");
    return waitResult;
  }
  return stopResult;
}

async function describeInstances(client, params, region) {
  const awsDescribeInstances = awsPlugin.generateAwsMethod("describeInstances", payloadFuncs.prepareDescribeInstancesPayload);
  if (!params.GET_ALL_RECURSIVELY) {
    return awsDescribeInstances(client, params, region);
  }
  const getAllInstancesRecursively = async (nextToken) => {
    const result = await awsDescribeInstances(client, { ...params, nextToken }, region);
    if (result.NextToken) {
      const recursiveResult = await getAllInstancesRecursively(result.NextToken);
      return [...result.Reservations, ...recursiveResult];
    }
    return result.Reservations;
  };
  return { Reservations: await getAllInstancesRecursively() };
}

async function modifyInstanceType(client, params) {
  return Promise.all(params.instanceIds.map((instanceId) => {
    const payload = {
      InstanceId: instanceId,
      InstanceType: { Value: params.instanceType },
    };
    return client.modifyInstanceAttribute(payload).promise();
  }));
}

async function modifyInstanceAttribute(client, params) {
  return Promise.all(params.instanceIds.map((instanceId) => {
    const payload = {
      InstanceId: instanceId,
      DryRun: params.dryRun,
      [params.attribute]: {
        Value: params.attributeValue,
      },
    };

    return client.modifyInstanceAttribute(payload).promise();
  }));
}

async function associateRouteTable(client, params, region) {
  const awsAssociateRouteTableToSubnet = awsPlugin.generateAwsMethod("associateRouteTable", payloadFuncs.prepareAssociateRouteTableToSubnetPayload);
  const awsAssociateRouteTableToGateway = awsPlugin.generateAwsMethod("associateRouteTable", payloadFuncs.prepareAssociateRouteTableToGatewayPayload);

  let result = {};

  if (params.subnetId) {
    result = {
      associateRouteTableToSubnet:
      (await awsAssociateRouteTableToSubnet(client, params, region)).associateRouteTable,
    };
  }
  if (params.gatewayId) {
    result = _.merge(
      result,
      {
        associateRouteTableToGateway:
          (await awsAssociateRouteTableToGateway(client, params, region)).associateRouteTable,
      },
    );
  }

  return result;
}

async function createInternetGatewayWorkflow(client, params, region) {
  const awsCreateInternetGateway = awsPlugin.generateAwsMethod("createInternetGateway", payloadFuncs.prepareCreateInternetGatewayPayload);
  const result = { createInternetGateway: await awsCreateInternetGateway(client, params, region) };

  if (params.vpcId) {
    const attachInternetGatewayParams = awsPlugin.helpers.prepareParametersForAnotherMethodCall(
      "attachInternetGateway",
      params,
      { InternetGatewayId: result.createInternetGateway.InternetGateway.InternetGatewayId },
    );

    return _.merge(
      result,
      {
        attachInternetGateway:
          await simpleAwsFunctions.attachInternetGateway(
            client,
            attachInternetGatewayParams,
            region,
          ),
      },
    );
  }

  return result;
}

async function createRouteTableWorkflow(client, params, region) {
  const awsCreateRouteTable = awsPlugin.generateAwsMethod("createRouteTable", payloadFuncs.prepareCreateRouteTablePayload);
  const result = { createRouteTable: await awsCreateRouteTable(client, params, region) };

  if (params.subnetId || params.gatewayId) {
    const associateRouteTableParams = awsPlugin.helpers.prepareParametersForAnotherMethodCall(
      "associateRouteTable",
      params,
      { RouteTableId: result.createRouteTable.RouteTable.RouteTableId },
    );

    return _.merge(
      result,
      { associateRouteTable: await associateRouteTable(client, associateRouteTableParams, region) },
    );
  }

  return result;
}

async function createVpcWorkflow(client, params, region) {
  const awsCreateVpc = awsPlugin.generateAwsMethod("createVpc", payloadFuncs.prepareCreateVpcPayload);
  let result = { createVpc: await awsCreateVpc(client, params, region) };

  const additionalParams = {
    vpcId: result.createVpc.Vpc.VpcId,
  };

  if (params.createInternetGateway) {
    const createInternetGatewayParams = awsPlugin.helpers.prepareParametersForAnotherMethodCall(
      "createInternetGateway",
      params,
      additionalParams,
    );
    result = _.merge(
      result,
      await createInternetGatewayWorkflow(client, createInternetGatewayParams, region),
    );
  }

  if (params.createRouteTable) {
    const createRouteTableParams = awsPlugin.helpers.prepareParametersForAnotherMethodCall(
      "createRouteTable",
      params,
      additionalParams,
    );

    result = _.merge(
      result,
      createRouteTableWorkflow(client, createRouteTableParams, region),
    );

    if (params.createInternetGateway) {
      const createRouteParams = awsPlugin.helpers.prepareParametersForAnotherMethodCall(
        "createRoute",
        params,
        {
          RouteTableId: additionalParams.createRouteTable.RouteTable.RouteTableId,
          DestinationCidrBlock: "0.0.0.0/0",
          GatewayId: additionalParams.createInternetGateway.InternetGateway.InternetGatewayId,
        },
      );

      result = _.merge(
        result,
        { createRoute: await simpleAwsFunctions.createRoute(client, createRouteParams, region) },
      );
    }
  }

  if (params.createSecurityGroup) {
    const createSecurityGroupParams = awsPlugin.helpers.prepareParametersForAnotherMethodCall(
      "createSecurityGroup",
      params,
      {
        ...additionalParams,
        GroupName: `${additionalParams.vpcId}-dedicated-security-group`,
        Description: `A security group dedicated only for ${additionalParams.vpcId}`,
      },
    );

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
  const awsCreateSubnet = awsPlugin.generateAwsMethod("createSubnet", payloadFuncs.prepareCreateSubnetPayload);
  let result = { createSubnet: await awsCreateSubnet(client, params, region) };

  const additionalParams = {
    SubnetId: result.createSubnet.Subnet.SubnetId,
  };

  if (params.allocationId) {
    const createNatGatewayParams = awsPlugin.helpers.prepareParametersForAnotherMethodCall(
      "createNatGateway",
      params,
      additionalParams,
    );
    result = _.merge(
      result,
      {
        createNatGateway:
          await simpleAwsFunctions.createNatGateway(client, createNatGatewayParams, region),
      },
    );
  }

  if (params.routeTableId) {
    const associateRouteTableParams = awsPlugin.helpers.prepareParametersForAnotherMethodCall(
      "associateRouteTable",
      params,
      additionalParams,
    );

    result = _.merge(
      result,
      { associateRouteTable: await associateRouteTable(client, associateRouteTableParams, region) },
    );
  } else if (params.createPrivateRouteTable) {
    const createRouteTableParams = awsPlugin.helpers.prepareParametersForAnotherMethodCall(
      "createRouteTable",
      params,
      additionalParams,
    );

    result = _.merge(
      result,
      await createRouteTableWorkflow(client, createRouteTableParams, region),
    );

    if (result.createNatGateway) {
      await client.waitFor("natGatewayAvailable", {
        NatGatewayIds: [result.createNatGateway.NatGateway.NatGatewayId],
      }).promise();

      const createRouteParams = awsPlugin.helpers.prepareParametersForAnotherMethodCall(
        "createRoute",
        params,
        {
          SubnetId: additionalParams.SubnetId,
          RouteTableId: additionalParams.createRouteTable.RouteTable.RouteTableId,
          NatGatewayId: additionalParams.createNatGateway.NatGateway.NatGatewayId,
          DestinationCidrBlock: "0.0.0.0/0",
        },
      );

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
    "createVolume",
    payloadFuncs.prepareCreateVolumePayload,
  );
  let result = { createVolume: await awsCreateVolume(client, params, region) };

  if (!params.waitForEnd) {
    return result;
  }

  result = await client.waitFor("volumeAvailable", {
    VolumeIds: [result.createVolume.VolumeId],
  }).promise();

  return { createVolume: result.Volumes[0] };
}

async function createSnapshot(client, params, region) {
  const awsCreateSnapshot = awsPlugin.generateAwsMethod(
    "createSnapshot",
    payloadFuncs.prepareCreateSnapshotPayload,
  );
  let result = { createSnapshot: await awsCreateSnapshot(client, params, region) };

  if (!params.waitForEnd) {
    return result;
  }

  result = await client.waitFor("snapshotCompleted", {
    SnapshotIds: [result.createSnapshot.SnapshotId],
  }).promise();

  return { createSnapshot: result.Snapshots[0] };
}

async function addSecurityGroupRules(client, params) {
  const payload = payloadFuncs.prepareAddSecurityGroupRulesPayload(params);
  const funcName = resolveSecurityGroupFunction(params.ruleType);

  return client[funcName](payload).promise();
}

module.exports = {
  ...awsPlugin.bootstrap(
    aws.EC2,
    {
      ...simpleAwsFunctions,
      modifyInstanceType,
      modifyInstanceAttribute,
      createVpc: createVpcWorkflow,
      createSubnet: createSubnetWorkflow,
      createInternetGateway: createInternetGatewayWorkflow,
      createRouteTable: createRouteTableWorkflow,
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
  ),

};
