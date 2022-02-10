const {runEc2Func, parseLegacyParam, getPortObj, waitForNatGateway, wairForEc2Resource} = require('./helpers');
const parsers = require('./parsers');
const {getInstanceTypes, listRegions} = require('./autocomplete')

async function createInstance(action, settings) {
    const params = {
        ImageId: parsers.string(action.params.IMAGE_ID),
        InstanceType: parsers.string(action.params.INSTANCE_TYPE),
        MinCount: parseInt(action.params.MIN_COUNT || 1),
        MaxCount: parseInt(action.params.MAX_COUNT | 1),
        KeyName: parsers.string(action.params.KEY_NAME),
        SecurityGroupIds: parsers.array(action.params.SECURITY_GROUP_IDS),
        SubnetId: parsers.string(action.params.subnetId)
    };
    const userData = parsers.string(action.params.userData);
    if (userData) {
        const buffer = new Buffer(userData);
        params.UserData = buffer.toString("base64");
    }
    if (params.MaxCount < params.MinCount) {
        throw "Max Count must be bigger or equal to Min Count";
    }

    if (action.params.TAGS_SPECIFICATION) {
        params.TagSpecifications = [{
            ResourceType: "instance",
            Tags: parseLegacyParam(action.params.TAGS_SPECIFICATION, parsers.tags)
        }]
    }

    return runEc2Func(action, settings, params, "runInstances");
}

async function manageInstances(action, settings) {
    const params = {
        InstanceIds: parseLegacyParam(action.params.INSTANCE_IDS, parsers.array)
    };
    if (params.InstanceIds.length === 0) {
        throw "You must provide at least one Instance ID";
    }
    return runEc2Func(action, settings, params, action.method.name);
}

async function callAwsNoParams(action, settings) {
    return runEc2Func(action, settings, {}, action.method.name);
}

async function manageKeyPairs(action, settings) {
    const params = {
        KeyName: action.params.KEY_PAIR_NAME
    };
    if (!params.KeyName) {
        throw "Must provide Key Name";
    }
    return runEc2Func(action, settings, params, action.method.name);
}

async function allocateAddress(action, settings) {
    const params = {
        Domain: action.params.DOMAIN,
        Address: action.params.ADDRESS,
        PublicIpv4Pool: action.params.PUBLICIPV4POOL,
        DryRun: action.params.DRYRUN
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
        PrivateIpAddress: action.params.PRIVATE_IP_ADDRESS
    }
    return runEc2Func(action, settings, params, "associateAddress");
}

async function releaseAddress(action, settings) {
    const params = {
        AllocationId: action.params.ALLOCATION_ID,
        PublicIp: action.params.PUBLIC_IP,
        DryRun: action.params.DRYRUN
    }
    return runEc2Func(action, settings, params, "releaseAddress");
}

async function describeInstances(action, settings) {
    const params = {
        DryRun: action.params.DRYRUN,
        MaxResults: action.params.MAX_RESULTS,
        NextToken: action.params.NEXT_TOKEN
    }
    if (action.params.INSTANCE_IDS) {
        params.InstanceIds = parseLegacyParam(action.params.INSTANCE_IDS, parsers.array)
    }
    if (action.params.filters) {
        if (!Array.isArray(action.params.filters))
            return reject("Filters ids must be an array");
        params.Filters = action.params.filters;
    }
    return runEc2Func(action, settings, params, "describeInstances");
}

async function createVpc(action, settings) {
    const params = {
        CidrBlock: action.params.cidrBlock,
        AmazonProvidedIpv6CidrBlock: action.params.amazonProvidedIpv6CidrBlock || false,
        InstanceTenancy: action.params.instanceTenancy || "default",
        DryRun: action.params.dryRun || false
    }
    if (!params.CidrBlock && !params.AmazonProvidedIpv6CidrBlock) {
        throw "Must provide CIDR Block or select AmazonProvidedIpv6CidrBlock";
    }
    if (action.params.tags) {
        params.TagSpecifications = [{ResourceType: "vpc", Tags: parsers.tags(action.params.tags)}];
    }
    let result = await runEc2Func(action, settings, params, "createVpc");
    action.params.vpcId = result.createVpc.Vpc.VpcId; // for later use
    if (action.params.createInternetGateway) {
        // we use '...' since createInternetGateway can return multiple action results
        result = {...result, ...(await createInternetGateway(action, settings))};
    }
    if (action.params.createRouteTable) {
        action.params.gatewayId = undefined;
        result = {...result, ...(await createRouteTable(action, settings))};
        if (action.params.createInternetGateway) {
            action.params.routeTableId = result.createRouteTable.RouteTable.RouteTableId;
            action.params.destinationCidrBlock = "0.0.0.0/0";
            action.params.gatewayId = result.createInternetGateway.InternetGateway.InternetGatewayId;
            result = {...result, ...(await createRoute(action, settings))};
        }
    }
    if (action.params.createSecurityGroup) {
        action.params.name = `${action.params.vpcId}-dedicated-security-group`;
        action.params.description = `A security group dedicated only for ${action.params.vpcId}`;
        result = {...result, ...(await createSecurityGroup(action, settings))};
    }
    return result;
}

async function createSubnet(action, settings) {
    const params = {
        AvailabilityZone: parsers.string(action.params.availabilityZone),
        CidrBlock: parsers.string(action.params.cidrBlock),
        Ipv6CidrBlock: parsers.string(action.params.ipv6CidrBlock),
        VpcId: parsers.string(action.params.vpcId),
        OutpostArn: parsers.string(action.params.outpostArn),
        DryRun: action.params.dryRun || false,
    }
    if (!(params.CidrBlock || params.Ipv6CidrBlock)) {
        throw "Must provide CIDR Block or IPv6 CIDR Block";
    }
    if (action.params.tags) {
        params.TagSpecifications = [{ResourceType: "subnet", Tags: parsers.tags(action.params.tags)}];
    }

    let result = await runEc2Func(action, settings, params, "createSubnet");
    action.params.subnetId = result.createSubnet.Subnet.SubnetId;

    if (action.params.allocationId) { // indicates that nat gateway is needed
        result = {...result, ...(await createNatGateway(action, settings))};
    }
    if (action.params.routeTableId) {
        result = {...result, ...(await associateRouteTable(action, settings))};
    } else if (action.params.createPrivateRouteTable) {
        result = {...result, ...(await createRouteTable(action, settings))};
        if (result.createNatGateway) {
            // if nat gateway also was created, connect to correct route
            action.params.routeTableId = result.createRouteTable.RouteTable.RouteTableId;
            action.params.natGatewayId = result.createNatGateway.NatGateway.NatGatewayId;
            action.params.destinationCidrBlock = "0.0.0.0/0";
            // wait for nat gateway to be available than create route
            await waitForNatGateway(action, settings);
            result = {...result, ...(await createRoute(action, settings))};
        }
    }
    if (action.params.mapPublicIpOnLaunch) {
        const chagneAttrParams = {
            SubnetId: action.params.subnetId,
            MapPublicIpOnLaunch: {Value: true}
        }
        result = {...result, ...(await runEc2Func(action, settings, chagneAttrParams, "modifySubnetAttribute"))};
    }
    return result;
}

async function deleteVpc(action, settings) {
    const params = {
        VpcId: action.params.vpcId,
        DryRun: action.params.dryRun
    }
    return runEc2Func(action, settings, params, "deleteVpc");
}

async function deleteSubnet(action, settings) {
    const params = {
        SubnetId: action.params.subnetId,
        DryRun: action.params.dryRun,
    }
    return runEc2Func(action, settings, params, "deleteSubnet");
}

async function modifyInstanceType(action, settings) {
    const instanceIds = parsers.array(action.params.instanceIds);
    const instanceType = {Value: parsers.autocomplete(action.params.instanceType)};
    if (!instanceType.Value || !instanceIds || !instanceIds.length) throw "Didn't provide one of the required fields";
    return Promise.all(instanceIds.map((instanceId) => {
        const params = {
            InstanceId: instanceId,
            InstanceType: instanceType
        };
        return runEc2Func(action, settings, params, "modifyInstanceAttribute", true);
    }));
}

async function createInternetGateway(action, settings) {
    const params = {
        DryRun: action.params.dryRun
    }
    if (action.params.tags) {
        params.TagSpecifications = [{ResourceType: "internet-gateway", Tags: parsers.tags(action.params.tags)}];
    }
    const vpcId = parsers.string(action.params.vpcId);
    let result = await runEc2Func(action, settings, params, "createInternetGateway");
    if (vpcId) {
        action.params.gatewayId = result.createInternetGateway.InternetGateway.InternetGatewayId;
        result = {...result, ...(await attachInternetGateway(action, settings))};
    }
    return result;
}


async function createRouteTable(action, settings) {
    const params = {
        VpcId: (action.params.vpcId || "").trim(),
        DryRun: action.params.dryRun || false
    };
    if (!params.VpcId) {
        throw "Didn't provide VPC ID!";
    }
    if (action.params.tags) {
        params.TagSpecifications = [{ResourceType: "route-table", Tags: parsers.tags(action.params.tags)}];
    }

    let result = await runEc2Func(action, settings, params, "createRouteTable");
    if (action.params.subnetId || action.params.gatewayId) {
        action.params.routeTableId = result.createRouteTable.RouteTable.RouteTableId;
        result = {...result, ...(await associateRouteTable(action, settings))};
    }
    return result;
}

async function createNatGateway(action, settings) {
    const params = {
        SubnetId: (action.params.subnetId || "").trim(),
        AllocationId: action.params.allocationId,
        DryRun: action.params.dryRun || false
    };
    if (!params.SubnetId) {
        throw "One of the required parameters was not given!";
    }
    if (action.params.tags) {
        params.TagSpecifications = [{ResourceType: "natgateway", Tags: parsers.tags(action.params.tags)}];
    }
    return runEc2Func(action, settings, params, "createNatGateway");
}

async function createSecurityGroup(action, settings) {
    const params = {
        GroupName: (action.params.name || "").trim(),
        Description: (action.params.description || "").trim(),
        VpcId: action.params.vpcId,
        DryRun: action.params.dryRun || false
    };
    if (!params.GroupName || !params.Description) {
        throw "One of the required parameters was not given!";
    }
    if (action.params.tags) {
        params.TagSpecifications = [{ResourceType: "security-group", Tags: parsers.tags(action.params.tags)}];
    }
    return runEc2Func(action, settings, params, "createSecurityGroup");
}

async function associateRouteTable(action, settings) {
    const params = {
        RouteTableId: (action.params.routeTableId || "").trim(),
        DryRun: action.params.dryRun || false
    };
    if (!params.RouteTableId) {
        throw "Route Table ID was not given!";
    }
    if (!action.params.subnetId && !action.params.gatewayId) {
        throw "You need to provide a Subnet ID or a Gateway ID!";
    }
    let result;
    if (action.params.subnetId) { // we need to associate subnet and gateway in seperate functions - otherwise fails...
        const subParams = {
            ...params,
            SubnetId: (action.params.subnetId || "").trim()
        }
        result = await runEc2Func(action, settings, subParams, "associateRouteTable");
    }
    if (action.params.gatewayId) {
        const subParams = {
            ...params,
            GatewayId: (action.params.gatewayId || "").trim()
        }
        if (result) {
            const gatewayResult = await runEc2Func(action, settings, subParams, "associateRouteTable")
            result = {
                "associateRouteTableToSubnet": result.associateRouteTable,
                "associateRouteTableToGateway": gatewayResult.associateRouteTable
            }
        } else {
            result = await runEc2Func(action, settings, subParams, "associateRouteTable");
        }
    }
    return result;
}

async function attachInternetGateway(action, settings) {
    const params = {
        InternetGatewayId: (action.params.gatewayId || "").trim(),
        VpcId: (action.params.vpcId || "").trim(),
        DryRun: action.params.dryRun || false
    };
    if (!action.params.vpcId || !action.params.gatewayId) {
        throw "You need to provide a Subnet ID or a Gateway ID!";
    }
    return runEc2Func(action, settings, params, "attachInternetGateway");
}

async function addSecurityGroupRules(action, settings) {
    const arrays = ["cidrIps", "cidrIps6", "fromPorts", "toPorts"]
    arrays.forEach(arrayName => {
        action.params[arrayName] = parsers.array((action.params[arrayName]));
    })
    const {cidrIps, cidrIps6, fromPorts, toPorts, ipProtocol, description, ruleType} = action.params;
    if (fromPorts.length === 0 || toPorts.length === 0) throw "Must provide from and to ports!";
    if (fromPorts.length !== toPorts.length) throw "From Ports and To Ports must be the same length";

    const params = {
        GroupId: parsers.string(action.params.groupId),
        IpPermissions: fromPorts.map((fromPort, index) =>
            getPortObj(fromPort, toPorts[index], ipProtocol, cidrIps, cidrIps6, description))
    };
    if (!params.GroupId) {
        throw "Must provide Group ID";
    }

    const funcName = ruleType === "Egress-Authorize" ? "authorizeSecurityGroupEgress" :
        ruleType === "Ingress-Revoke" ? "revokeSecurityGroupIngress" :
            ruleType === "Egress-Revoke" ? "revokeSecurityGroupEgress" :
                "authorizeSecurityGroupIngress"; // default

    return runEc2Func(action, settings, params, funcName);
}

async function createRoute(action, settings) {
    const params = {
        RouteTableId: parsers.string(action.params.routeTableId),
        GatewayId: parsers.string(action.params.gatewayId),
        NatGatewayId: parsers.string(action.params.natGatewayId),
        InstanceId: parsers.string(action.params.instanceId),
        DestinationCidrBlock: parsers.string(action.params.destinationCidrBlock),
        DryRun: action.params.dryRun
    };
    if (!params.RouteTableId || !params.DestinationCidrBlock) {
        throw "One of the required parameters was not given";
    }
    return runEc2Func(action, settings, params, "createRoute");
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
        DryRun: parsers.boolean(action.params.dryRun)
    };
    if ((!params.AvailabilityZone && !params.OutpostArn) || !params.VolumeType) {
        throw "One of the required parameters was not given";
    }
    var result = await runEc2Func(action, settings, params, "createVolume");
    if (!action.params.waitForEnd) {
        return result;
    }
    result = await wairForEc2Resource(action, "volumeAvailable", {VolumeIds: [result.createVolume.VolumeId]});
    return {createVolume: result.Volumes[0]};
}

async function createSnapshot(action, settings) {
    const params = {
        VolumeId: parsers.string(action.params.volumeId),
        Description: parsers.string(action.params.description),
        OutpostArn: parsers.string(action.params.outpostArn),
        DryRun: parsers.boolean(action.params.dryRun)
    };
    if (!params.VolumeId) {
        throw "Must provide volume ID to create the snapshot of!";
    }
    var result = await runEc2Func(action, settings, params, "createSnapshot");
    if (!action.params.waitForEnd) {
        return result;
    }
    result = await wairForEc2Resource(action, "snapshotCompleted", {SnapshotIds: [result.createSnapshot.SnapshotId]});
    return {createSnapshot: result.Snapshots[0]};
}

async function modifyInstanceAttribute(action, settings) {
    const instanceIds = parsers.array(action.params.instanceIds);
    return Promise.all(instanceIds.map((instanceId) => {
        const params = {
            InstanceId: instanceId,
            InstanceType: {
                Value: parsers.autocomplete(action.params.instanceType)
            },
            Kernel: {
                Value: parsers.string(action.params.kernel)
            },
            Ramdisk: {
                Value: parsers.string(action.params.ramdisk)
            },
            UserData: {
                Value: parsers.string(action.params.userData)
            },
            DisableApiTermination: {
                Value: parsers.string(action.params.disableApiTermination)
            },
            InstanceInitiatedShutdownBehavior: {
                Value: parsers.string(action.params.instanceInitiatedShutdownBehavior)
            },
            RootDeviceName: {
                Value: parsers.string(action.params.rootDeviceName)
            },
            BlockDeviceMapping: {
                Value: parsers.string(action.params.blockDeviceMapping)
            },
            ProductCodes: {
                Value: parsers.string(action.params.productCodes)
            },
            SourceDestCheck: {
                Value: parsers.string(action.params.sourceDestCheck)
            },
            GroupSet: {
                Value: parsers.string(action.params.groupSet)
            },
            EbsOptimized: {
                Value: parsers.string(action.params.ebsOptimized)
            },
            SriovNetSupport: {
                Value: parsers.string(action.params.sriovNetSupport)
            },
            EnaSupport: {
                Value: parsers.string(action.params.enaSupport)
            },
            EnclaveOptions: {
                Value: parsers.string(action.params.enclaveOptions)
            },
            DryRun: parsers.boolean(action.params.dryRun)
        };
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
    modifyInstanceAttribute
};
