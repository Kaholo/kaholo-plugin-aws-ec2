const _ = require("lodash");
const aws = require("aws-sdk");
const awsPlugin = require("kaholo-aws-plugin");
const { resolveSecurityGroupFunction } = require("./helpers");
const { getInstanceTypes, listRegions, listSubnets } = require("./autocomplete");
const payloadFuncs = require("./payload-functions");

const simpleAwsFunctions = {
  createInstance: awsPlugin.generateAwsMethod("runInstances", payloadFuncs.prepareCreateInstancePayload),
  startInstances: awsPlugin.generateAwsMethod("startInstances"),
  stopInstances: awsPlugin.generateAwsMethod("stopInstances"),
  rebootInstances: awsPlugin.generateAwsMethod("rebootInstances"),
  terminateInstances: awsPlugin.generateAwsMethod("terminateInstances"),
  describeInstances: awsPlugin.generateAwsMethod("describeInstances", payloadFuncs.prepareDescribeInstancesPayload),
  createNatGateway: awsPlugin.generateAwsMethod("createNatGateway", payloadFuncs.prepareCreateNatGatewayPayload),
  createRoute: awsPlugin.generateAwsMethod("createRoute"),
  modifySubnetAttribute: awsPlugin.generateAwsMethod("modifySubnetAttribute"),
  attachInternetGateway: awsPlugin.generateAwsMethod("attachInternetGateway"),
  createSecurityGroup: awsPlugin.generateAwsMethod("createSecurityGroup", payloadFuncs.prepareCreateSecurityGroupPayload),
  createKeyPair: awsPlugin.generateAwsMethod("createKeyPair"),
  deleteKeyPair: awsPlugin.generateAwsMethod("deleteKeyPair"),
  describeKeyPairs: awsPlugin.generateAwsMethod("describeKeyPairs"),
  allocateAddress: awsPlugin.generateAwsMethod("allocateAddress"),
  associateAddress: awsPlugin.generateAwsMethod("associateAddress"),
  releaseAddress: awsPlugin.generateAwsMethod("releaseAddress"),
  deleteVpc: awsPlugin.generateAwsMethod("deleteVpc"),
  deleteSubnet: awsPlugin.generateAwsMethod("deleteSubnet"),
};

async function modifyInstanceType(client, params) {
  return Promise.all(params.InstanceIds.map((instanceId) => {
    const payload = {
      InstanceId: instanceId,
      InstanceType: { Value: params.InstanceType },
    };
    return client.modifyInstanceAttribute(payload).promise();
  }));
}

async function modifyInstanceAttribute(client, params) {
  return Promise.all(params.InstanceIds.map((instanceId) => {
    const payload = {
      InstanceId: instanceId,
      DryRun: params.DryRun,
      [params.Attribute]: {
        Value: params.AttributeValue,
      },
    };

    return client.modifyInstanceAttribute(payload).promise();
  }));
}

async function associateRouteTable(client, params, region) {
  const awsAssociateRouteTableToSubnet = awsPlugin.generateAwsMethod("associateRouteTable", payloadFuncs.prepareAssociateRouteTableToSubnetPayload);
  const awsAssociateRouteTableToGateway = awsPlugin.generateAwsMethod("associateRouteTable", payloadFuncs.prepareAssociateRouteTableToGatewayPayload);

  let result = {};

  if (params.SubnetId) {
    result = {
      associateRouteTableToSubnet:
      (await awsAssociateRouteTableToSubnet(client, params, region)).associateRouteTable,
    };
  }
  if (params.GatewayId) {
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

  if (params.VpcId) {
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

  if (params.SubnetId || params.GatewayId) {
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
    VpcId: result.createVpc.Vpc.VpcId,
  };

  if (params.CreateInternetGateway) {
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

  if (params.CreateRouteTable) {
    const createRouteTableParams = awsPlugin.helpers.prepareParametersForAnotherMethodCall(
      "createRouteTable",
      params,
      additionalParams,
    );

    result = _.merge(
      result,
      createRouteTableWorkflow(client, createRouteTableParams, region),
    );

    if (params.CreateInternetGateway) {
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

  if (params.CreateSecurityGroup) {
    const createSecurityGroupParams = awsPlugin.helpers.prepareParametersForAnotherMethodCall(
      "createSecurityGroup",
      params,
      {
        ...additionalParams,
        GroupName: `${params.VpcId}-dedicated-security-group`,
        Description: `A security group dedicated only for ${params.VpcId}`,
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

  if (params.AllocationId) {
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

  if (params.RouteTableId) {
    const associateRouteTableParams = awsPlugin.helpers.prepareParametersForAnotherMethodCall(
      "associateRouteTable",
      params,
      additionalParams,
    );

    result = _.merge(
      result,
      { associateRouteTable: await associateRouteTable(client, associateRouteTableParams, region) },
    );
  } else if (params.CreatePrivateRouteTable) {
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

  if (params.MapPublicIpOnLaunch) {
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
    (parameters) => _.omit(parameters, "WaitForEnd"),
  );
  let result = { createVolume: await awsCreateVolume(client, params, region) };

  if (!params.WaitForEnd) {
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
    (parameters) => _.omit(parameters, "WaitForEnd"),
  );
  let result = { createSnapshot: await awsCreateSnapshot(client, params, region) };

  if (!params.WaitForEnd) {
    return result;
  }

  result = await client.waitFor("snapshotCompleted", {
    SnapshotIds: [result.createSnapshot.SnapshotId],
  }).promise();

  return { createSnapshot: result.Snapshots[0] };
}

async function addSecurityGroupRules(client, params) {
  const payload = payloadFuncs.prepareAddSecurityGroupRulesPayload(params);
  const funcName = resolveSecurityGroupFunction(params.RuleType);

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
    },
    {
      getInstanceTypes,
      listRegions,
      listSubnets,
    },
  ),

};
