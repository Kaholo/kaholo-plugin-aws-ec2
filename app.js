const _ = require("lodash");
const aws = require("aws-sdk");
const awsPlugin = require("kaholo-aws-plugin");
const { resolveSecurityGroupFunction } = require("./helpers");
const { getInstanceTypes, listRegions, listSubnets } = require("./autocomplete");
const payloadFuncs = require("./payload-functions");

function EC2Func(funcName, payloadFunction = null) {
  return awsPlugin.mapToAws(aws.EC2, funcName, payloadFunction);
}

const awsCreateNatGateway = EC2Func("createNatGateway", payloadFuncs.prepareCreateNatGatewayPayload);
const awsCreateRoute = EC2Func("createRoute");
const awsModifySubnetAttribute = EC2Func("modifySubnetAttributes");
const awsAttachInternetGateway = EC2Func("attachInternetGateway");
const awsCreateSecurityGroup = EC2Func("createSecurityGroup", payloadFuncs.prepareCreateSecurityGroupPayload);

async function modifyInstanceType(action, settings) {
  const { client, params } = awsPlugin.handleInput(aws.EC2, action, settings, { InstanceIds: "array" });

  return Promise.all(params.InstanceIds.map((instanceId) => {
    const payload = {
      InstanceId: instanceId,
      InstanceType: { Value: params.InstanceType },
    };
    return client.modifyInstanceAttribute(payload).promise();
  }));
}

async function modifyInstanceAttribute(action, settings) {
  const { client, params } = awsPlugin.handleInput(aws.EC2, action, settings, { InstanceIds: "array" });

  return Promise.all(params.instanceIds.map((instanceId) => {
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

async function associateRouteTable(action, settings) {
  const awsAssociateRouteTableToSubnet = EC2Func("associateRouteTable", payloadFuncs.prepareAssociateRouteTableToSubnetPayload);
  const awsAssociateRouteTableToGateway = EC2Func("associateRouteTable", payloadFuncs.prepareAssociateRouteTableToGatewayPayload);

  const params = awsPlugin.helpers.readActionArguments(action);
  let result = {};

  if (params.SubnetId) {
    result = {
      associateRouteTableToSubnet:
      (await awsAssociateRouteTableToSubnet(action, settings)).associateRouteTable,
    };
  }
  if (params.GatewayId) {
    result = _.merge(
      result,
      {
        associateRouteTableToGateway:
          (await awsAssociateRouteTableToGateway(action, settings)).associateRouteTable,
      },
    );
  }

  return result;
}

async function createInternetGatewayWorkflow(action, settings) {
  const awsCreateInternetGateway = EC2Func("createInternetGateway", payloadFuncs.prepareCreateInternetGatewayPayload);

  const params = awsPlugin.helpers.readActionArguments(action);
  const result = { createInternetGateway: await awsCreateInternetGateway(action, settings) };

  if (params.VpcId) {
    const attachInternetGatewayAction = awsPlugin.helpers.convertActionForAnotherMethodCall("attachInternetGateway", action, {
      InternetGatewayId: result.createInternetGateway.InternetGateway.InternetGatewayId,
    });

    return _.merge(
      result,
      {
        attachInternetGateway:
          await awsAttachInternetGateway(attachInternetGatewayAction, settings),
      },
    );
  }

  return result;
}

async function createRouteTableWorkflow(action, settings) {
  const awsCreateRouteTable = EC2Func("createRouteTable", payloadFuncs.prepareCreateRouteTablePayload);

  const params = awsPlugin.helpers.readActionArguments(action);
  const result = { createRouteTable: await awsCreateRouteTable(action, settings) };

  if (params.SubnetId || params.GatewayId) {
    const associateAction = awsPlugin.helpers.convertActionForAnotherMethodCall("associateRouteTable", action, {
      RouteTableId: result.createRouteTable.RouteTable.RouteTableId,
    });

    return _.merge(
      result,
      { associateRouteTable: await associateRouteTable(associateAction, settings) },
    );
  }

  return result;
}

async function createVpcWorkflow(action, settings) {
  const awsCreateVpc = EC2Func("createVpc", payloadFuncs.prepareCreateVpcPayload);

  const params = awsPlugin.helpers.readActionArguments(action);
  let result = { createVpc: await awsCreateVpc(action, settings) };

  const additionalParams = {
    VpcId: result.createVpc.Vpc.VpcId,
  };

  if (params.CreateInternetGateway) {
    const createGatewayAction = awsPlugin.helpers.convertActionForAnotherMethodCall("createInternetGateway", action, additionalParams);
    result = _.merge(
      result,
      await createInternetGatewayWorkflow(createGatewayAction, settings),
    );
  }

  if (params.CreateRouteTable) {
    const createRouteTableAction = awsPlugin.helpers.convertActionForAnotherMethodCall("createRouteTable", action, additionalParams);
    result = _.merge(
      result,
      await createRouteTableWorkflow(createRouteTableAction, settings),
    );

    if (params.CreateInternetGateway) {
      const createRouteAction = awsPlugin.helpers.convertActionForAnotherMethodCall("createRoute", action, {
        RouteTableId: result.createRouteTable.RouteTable.RouteTableId,
        DestinationCidrBlock: "0.0.0.0/0",
        GatewayId: result.createInternetGateway.InternetGateway.InternetGatewayId,
      });

      result = _.merge(
        result,
        { createRoute: await awsCreateRoute(createRouteAction, settings) },
      );
    }
  }

  if (params.CreateSecurityGroup) {
    const securityGroupAction = awsPlugin.helpers.convertActionForAnotherMethodCall("createSecurityGroup", action, {
      ...additionalParams,
      GroupName: `${params.VpcId}-dedicated-security-group`,
      Description: `A security group dedicated only for ${params.VpcId}`,
    });

    result = _.merge(
      result,
      { createSecurityGroup: await awsCreateSecurityGroup(securityGroupAction, settings) },
    );
  }

  return result;
}

async function createSubnetWorkflow(action, settings) {
  const awsCreateSubnet = EC2Func("createSubnet", payloadFuncs.prepareCreateSubnetPayload);

  const { client, params } = awsPlugin.handleInput(aws.EC2, action, settings);
  let result = { createSubnet: await awsCreateSubnet(action, settings) };

  const additionalParams = {
    SubnetId: result.createSubnet.Subnet.SubnetId,
  };

  if (params.AllocationId) {
    const createNatGatewayAction = awsPlugin.helpers.convertActionForAnotherMethodCall("createNatGateway", action, additionalParams);
    result = _.merge(
      result,
      { createNatGateway: await awsCreateNatGateway(createNatGatewayAction, settings) },
    );
  }

  if (params.RouteTableId) {
    const associateRouteTableAction = awsPlugin.helpers.convertActionForAnotherMethodCall("associateRouteTable", action, additionalParams);
    result = _.merge(
      result,
      { associateRouteTable: await associateRouteTable(associateRouteTableAction, settings) },
    );
  } else if (params.CreatePrivateRouteTable) {
    const createRouteTableAction = awsPlugin.helpers.convertActionForAnotherMethodCall("createRouteTableWorkflow", action, additionalParams);
    result = _.merge(
      result,
      await createRouteTableWorkflow(createRouteTableAction, settings),
    );

    if (result.createNatGateway) {
      // if nat gateway also was created, connect to correct route
      const createRouteAction = awsPlugin.helpers.convertActionForAnotherMethodCall("createRoute", action, {
        ...additionalParams,
        RouteTableId: result.createRouteTable.RouteTable.RouteTableId,
        NatGatewayId: result.createNatGateway.NatGateway.NatGatewayId,
        DestinationCidrBlock: "0.0.0.0/0",
      });

      // wait for nat gateway to be available than create route
      await client.waitFor("natGatewayAvailable", {
        NatGatewayIds: [result.createNatGateway.NatGateway.NatGatewayId],
      }).promise();

      result = _.merge(
        result,
        { createRoute: await awsCreateRoute(createRouteAction, settings) },
      );
    }
  }

  if (params.MapPublicIpOnLaunch) {
    const subnetAttributeAction = awsPlugin.helpers.convertActionForAnotherMethodCall("modifySubnetAttribute", action, {
      ...additionalParams,
      MapPublicIpOnLaunch: { Value: true },
    });

    result = _.merge(
      result,
      { modifySubnetAttribute: await awsModifySubnetAttribute(subnetAttributeAction, settings) },
    );
  }

  return result;
}

async function createVolume(action, settings) {
  const awsCreateVolume = EC2Func("createVolume", (params) => _.omit(params, "WaitForEnd"));

  const { client, params } = awsPlugin.handleInput(aws.EC2, action, settings);
  let result = { createVolume: await awsCreateVolume(action, settings) };

  if (!params.WaitForEnd) {
    return result;
  }

  result = await client.waitFor("volumeAvailable", {
    VolumeIds: [result.createVolume.VolumeId],
  }).promise();

  return { createVolume: result.Volumes[0] };
}

async function createSnapshot(action, settings) {
  const awsCreateSnapshot = EC2Func("createSnapshot", (params) => _.omit(params, "WaitForEnd"));

  const { client, params } = awsPlugin.handleInput(aws.EC2, action, settings);
  let result = { createSnapshot: await awsCreateSnapshot(action, settings) };

  if (!params.WaitForEnd) {
    return result;
  }

  result = await client.waitFor("snapshotCompleted", {
    SnapshotIds: [result.createSnapshot.SnapshotId],
  }).promise();

  return { createSnapshot: result.Snapshots[0] };
}

async function addSecurityGroupRules(action, settings) {
  const { client, params } = awsPlugin.handleInput(aws.EC2, action, settings, {
    CidrIps: "array",
    CidrIps6: "array",
    FromPorts: "array",
    ToPorts: "array",
  });

  const payload = payloadFuncs.prepareAddSecurityGroupRulesPayload(params);
  const funcName = resolveSecurityGroupFunction(params.RuleType);

  return client[funcName](payload).promise();
}

module.exports = {
  createInstance: EC2Func("runInstances", payloadFuncs.prepareCreateInstancePayload),
  startInstances: EC2Func("startInstances", payloadFuncs.prepareManageInstancesPayload),
  stopInstances: EC2Func("stopInstances", payloadFuncs.prepareManageInstancesPayload),
  rebootInstances: EC2Func("rebootInstances", payloadFuncs.prepareManageInstancesPayload),
  terminateInstances: EC2Func("terminateInstances", payloadFuncs.prepareManageInstancesPayload),
  describeInstances: EC2Func("describeInstances", payloadFuncs.prepareDescribeInstancesPayload),
  modifyInstanceType,
  modifyInstanceAttribute,
  createKeyPair: EC2Func("createKeyPair"),
  deleteKeyPair: EC2Func("deleteKeyPair"),
  describeKeyPairs: EC2Func("describeKeyPairs"),
  allocateAddress: EC2Func("allocateAddress"),
  associateAddress: EC2Func("associateAddress"),
  releaseAddress: EC2Func("releaseAddress"),
  createVpc: createVpcWorkflow,
  deleteVpc: EC2Func("deleteVpc"),
  createSubnet: createSubnetWorkflow,
  deleteSubnet: EC2Func("deleteSubnet"),
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

  // auto complete
  getInstanceTypes,
  listRegions,
  listSubnets,
};
