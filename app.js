const _ = require("lodash");
const aws = require("aws-sdk");
const awsPlugin = require("kaholo-aws-plugin");
const { resolveSecurityGroupFunction } = require("./helpers");
const { getInstanceTypes, listRegions, listSubnets } = require("./autocomplete");
const payloadFuncs = require("./payload-functions");

const awsCreateNatGateway = awsPlugin.generateAwsMethod("createNatGateway", payloadFuncs.prepareCreateNatGatewayPayload);
const awsCreateRoute = awsPlugin.generateAwsMethod("createRoute");
const awsModifySubnetAttribute = awsPlugin.generateAwsMethod("modifySubnetAttribute");
const awsAttachInternetGateway = awsPlugin.generateAwsMethod("attachInternetGateway");
const awsCreateSecurityGroup = awsPlugin.generateAwsMethod("createSecurityGroup", payloadFuncs.prepareCreateSecurityGroupPayload);

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
          await awsAttachInternetGateway(client, attachInternetGatewayParams, region),
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

async function callCreateInternetGatewayMethod(client, params, additionalParams, region) {
  const createInternetGatewayParams = awsPlugin.helpers.prepareParametersForAnotherMethodCall(
    "createInternetGateway",
    params,
    additionalParams,
  );
  return createInternetGatewayWorkflow(client, createInternetGatewayParams, region);
}

async function callCreateRouteTableMethod(client, params, additionalParams, region) {
  const createRouteTableParams = awsPlugin.helpers.prepareParametersForAnotherMethodCall(
    "createRouteTable",
    params,
    additionalParams,
  );

  return createRouteTableWorkflow(client, createRouteTableParams, region);
}

async function callCreateRouteForInternetGatewayMethod(client, params, additionalParams, region) {
  const createRouteParams = awsPlugin.helpers.prepareParametersForAnotherMethodCall(
    "createRoute",
    params,
    {
      RouteTableId: additionalParams.createRouteTable.RouteTable.RouteTableId,
      DestinationCidrBlock: "0.0.0.0/0",
      GatewayId: additionalParams.createInternetGateway.InternetGateway.InternetGatewayId,
    },
  );

  return { createRoute: await awsCreateRoute(client, createRouteParams, region) };
}

async function callCreateSecurityGroupMethod(client, params, additionalParams, region) {
  const createSecurityGroupParams = awsPlugin.helpers.prepareParametersForAnotherMethodCall(
    "createSecurityGroup",
    params,
    {
      ...additionalParams,
      GroupName: `${params.VpcId}-dedicated-security-group`,
      Description: `A security group dedicated only for ${params.VpcId}`,
    },
  );

  return {
    createSecurityGroup: await awsCreateSecurityGroup(client, createSecurityGroupParams, region),
  };
}

async function createVpcWorkflow(client, params, region) {
  const awsCreateVpc = awsPlugin.generateAwsMethod("createVpc", payloadFuncs.prepareCreateVpcPayload);
  let result = { createVpc: await awsCreateVpc(client, params, region) };

  const additionalParams = {
    VpcId: result.createVpc.Vpc.VpcId,
  };

  if (params.CreateInternetGateway) {
    result = _.merge(
      result,
      await callCreateInternetGatewayMethod(client, params, additionalParams),
    );
  }

  if (params.CreateRouteTable) {
    result = _.merge(
      result,
      await callCreateRouteTableMethod(client, params, additionalParams, region),
    );

    if (params.CreateInternetGateway) {
      result = _.merge(
        result,
        await callCreateRouteForInternetGatewayMethod(client, params, result, region),
      );
    }
  }

  if (params.CreateSecurityGroup) {
    result = _.merge(
      result,
      callCreateSecurityGroupMethod(client, params, additionalParams, region),
    );
  }

  return result;
}

async function callCreateNatGatewayMethod(client, params, additionalParams, region) {
  const createNatGatewayParams = awsPlugin.helpers.prepareParametersForAnotherMethodCall(
    "createNatGateway",
    params,
    additionalParams,
  );
  return { createNatGateway: await awsCreateNatGateway(client, createNatGatewayParams, region) };
}

async function callAssociateRouteTableMethod(client, params, additionalParams, region) {
  const associateRouteTableParams = awsPlugin.helpers.prepareParametersForAnotherMethodCall(
    "associateRouteTable",
    params,
    additionalParams,
  );
  return {
    associateRouteTable: await associateRouteTable(client, associateRouteTableParams, region),
  };
}

async function callCreateRouteForNatGatewayMethod(client, params, additionalParams, region) {
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

  return { createRoute: await awsCreateRoute(client, createRouteParams, region) };
}

async function callModifySubnetAttributeMethodToMapPublicIp(
  client,
  params,
  additionalParams,
  region,
) {
  const modifySubnetAttributeParams = {
    ...additionalParams,
    MapPublicIpOnLaunch: { Value: true },
  };

  return {
    modifySubnetAttribute: await awsModifySubnetAttribute(
      client,
      modifySubnetAttributeParams,
      region,
    ),
  };
}

async function createSubnetWorkflow(client, params, region) {
  const awsCreateSubnet = awsPlugin.generateAwsMethod("createSubnet", payloadFuncs.prepareCreateSubnetPayload);
  let result = { createSubnet: await awsCreateSubnet(client, params, region) };

  const additionalParams = {
    SubnetId: result.createSubnet.Subnet.SubnetId,
  };

  if (params.AllocationId) {
    result = _.merge(
      result,
      await callCreateNatGatewayMethod(client, params, additionalParams, region),
    );
  }

  if (params.RouteTableId) {
    result = _.merge(
      result,
      await callAssociateRouteTableMethod(client, params, additionalParams, region),
    );
  } else if (params.CreatePrivateRouteTable) {
    result = _.merge(
      result,
      await callCreateRouteTableMethod(client, params, additionalParams, region),
    );

    if (result.createNatGateway) {
      await client.waitFor("natGatewayAvailable", {
        NatGatewayIds: [result.createNatGateway.NatGateway.NatGatewayId],
      }).promise();

      result = _.merge(
        result,
        await callCreateRouteForNatGatewayMethod(
          client,
          params,
          { ...additionalParams, ...result },
          region,
        ),
      );
    }
  }

  if (params.MapPublicIpOnLaunch) {
    result = _.merge(
      result,
      await callModifySubnetAttributeMethodToMapPublicIp(client, params, additionalParams, region),
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
      createInstance: awsPlugin.generateAwsMethod("runInstances", payloadFuncs.prepareCreateInstancePayload),
      startInstances: awsPlugin.generateAwsMethod("startInstances"),
      stopInstances: awsPlugin.generateAwsMethod("stopInstances"),
      rebootInstances: awsPlugin.generateAwsMethod("rebootInstances"),
      terminateInstances: awsPlugin.generateAwsMethod("terminateInstances"),
      describeInstances: awsPlugin.generateAwsMethod("describeInstances", payloadFuncs.prepareDescribeInstancesPayload),
      modifyInstanceType,
      modifyInstanceAttribute,
      createKeyPair: awsPlugin.generateAwsMethod("createKeyPair"),
      deleteKeyPair: awsPlugin.generateAwsMethod("deleteKeyPair"),
      describeKeyPairs: awsPlugin.generateAwsMethod("describeKeyPairs"),
      allocateAddress: awsPlugin.generateAwsMethod("allocateAddress"),
      associateAddress: awsPlugin.generateAwsMethod("associateAddress"),
      releaseAddress: awsPlugin.generateAwsMethod("releaseAddress"),
      createVpc: createVpcWorkflow,
      deleteVpc: awsPlugin.generateAwsMethod("deleteVpc"),
      createSubnet: createSubnetWorkflow,
      deleteSubnet: awsPlugin.generateAwsMethod("deleteSubnet"),
      createNatGateway: awsCreateNatGateway,
      createInternetGateway: createInternetGatewayWorkflow,
      attachInternetGateway: awsAttachInternetGateway,
      createRoute: awsCreateRoute,
      createRouteTable: createRouteTableWorkflow,
      associateRouteTable,
      createVolume,
      createSnapshot,
      createSecurityGroup: awsCreateSecurityGroup,
      addSecurityGroupRules,
    },
    {
      getInstanceTypes,
      listRegions,
      listSubnets,
    },
  ),

};
