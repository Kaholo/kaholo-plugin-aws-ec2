const { runEc2Func } = require('./helpers');
const parsers = require('./parsers');
const { getInstanceTypes, getRegions } = require('./autocomplete')

async function createInstance(action, settings) {
    const params = {
        ImageId: action.params.IMAGE_ID,
        InstanceType: action.params.INSTANCE_TYPE,
        MinCount: parseInt(action.params.MIN_COUNT || 1),
        KeyName: action.params.KEY_NAME,
        SecurityGroupIds: action.params.SECURITY_GROUP_IDS,
        UserData: action.params.USER_DATA
    };
    if (action.params.MAX_COUNT){
        const max = parseInt(action.params.MAX_COUNT | 1);
        if (max < params.MinCount){
            throw "Max Count must be bigger or equal to Min Count";
        }
        params.MaxCount = max;
    }

    if (action.params.TAGS_SPECIFICATION) {
        params.TagSpecifications = [{ ResourceType: "instance", Tags: parsers.tags(action.params.TAGS_SPECIFICATION) }]
    }

    return runEc2Func(action, settings, params, "runInstances");
}

async function manageInstances(action, settings) {
    const params = {
        InstanceIds: parsers.array(action.params.INSTANCE_IDS)
    };
    if (params.InstanceIds.length === 0){
        throw "You must provide at least one Instance ID";
    }
    return runEc2Func(action, settings, params, action.method.name);
}

async function callAwsNoParams(action, settings){
    return runEc2Func(action, settings, {}, action.method.name);
}

async function manageKeyPairs(action, settings) {
    const params = {
        KeyName: action.params.KEY_PAIR_NAME
    };
    if (!params.KeyName){
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
        params.InstanceIds = parsers.array(action.params.INSTANCE_IDS);
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
    if (!params.CidrBlock && !params.AmazonProvidedIpv6CidrBlock){
        throw "Must provide CIDR Block or select AmazonProvidedIpv6CidrBlock";
    }
    if (action.params.tags){
        params.TagSpecifications = [{ResourceType: "vpc", Tags: parsers.tags(action.params.tags)}];
    }
    let result = await runEc2Func(action, settings, params, "createVpc");
    action.params.vpcId = result.createVpc.Vpc.VpcId; // for later use
    if (action.params.subnetCidrBlock){ // than create subnet
        action.params.cidrBlock = action.params.subnetCidrBlock;
        // we use '...' since createSubnet can return multiple action results
        result = {...result, ...(await createSubnet(action, settings))};
        action.params.subnetId = result.createSubnet.Subnet.SubnetId;
    }
    if (action.params.createInternetGateway){
        // we use '...' since createInternetGateway can return multiple action results
        result = {...result, ...(await createInternetGateway(action, settings))};
        action.params.gatewayId = result.createInternetGateway.InternetGateway.InternetGatewayId;
    }
    if (action.params.createRouteTable){
        // we use '...' since createRouteTable can return multiple action results
        result = {...result, ...(await createRouteTable(action, settings))};
    }
    if (action.params.createSecurityGroup){
        result = {...result, ...(await createSecurityGroup(action, settings))};
    }
    return result;
}

async function createSubnet(action, settings) {
    const params = {
        AvailabilityZone: action.params.availabilityZone,
        CidrBlock: action.params.cidrBlock,
        Ipv6CidrBlock: action.params.ipv6CidrBlock,
        VpcId: action.params.vpcId,
        OutpostArn: action.params.outpostArn,
        DryRun: action.params.dryRun || false,
    }
    if (!(params.CidrBlock || params.Ipv6CidrBlock)){
        throw "Must provide CIDR Block or IPv6 CIDR Block";
    }
    if (action.params.tags){
        params.TagSpecifications = [{ResourceType: "subnet", Tags: parsers.tags(action.params.tags)}];
    }

    let result = await runEc2Func(action, settings, params, "createSubnet");

    if (action.params.allocationId){ // indicates that nat gateway is needed
        action.params.subnetId = result.createSubnet.Subnet.SubnetId;
        result = {...result, ...(await createNatGateway(action, settings))};
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

async function modifyInstanceType(action, settings){
    const instanceIds = parsers.array(action.params.instanceIds);
    const instanceType = parsers.autocomplete(action.params.instanceType);
    return Promise.all(instanceIds.map((instanceId) => {
        const params = {
            InstanceId : instanceId,
            InstanceType: instanceType
        };
        return runEc2Func(action, settings, params, "modifyInstanceAttribute", true);  
    }));
}

async function createInternetGateway(action, settings) {
    const params = {
        DryRun: action.params.dryRun
    }
    if (action.params.tags){
        params.TagSpecifications = [{ResourceType: "internet-gateway", Tags: parsers.tags(action.params.tags)}];
    }
    const vpcId = parsers.string(action.params.vpcId);
    let result = await runEc2Func(action, settings, params, "createInternetGateway");
    if (vpcId){
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
    if (!params.VpcId){
        throw "Didn't provide VPC ID!";
    }
    if (action.params.tags){
        params.TagSpecifications = [{ResourceType: "route-table", Tags: parsers.tags(action.params.tags)}];
    }
    
    let result = await runEc2Func(action, settings, params, "createRouteTable");
    if (action.params.subnetId || action.params.gatewayId){
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
    if (!params.SubnetId){
        throw "One of the required parameters was not given!";
    }
    if (action.params.tags){
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
    if (!params.GroupName || !params.Description){
        throw "One of the required parameters was not given!";
    }
    if (action.params.tags){
        params.TagSpecifications = [{ResourceType: "security-group", Tags: parsers.tags(action.params.tags)}];
    }
    return runEc2Func(action, settings, params, "createSecurityGroup");
}

async function associateRouteTable(action, settings) {
    const params = {
        RouteTableId: (action.params.routeTableId || "").trim(),
        DryRun: action.params.dryRun || false
    };
    if (!params.RouteTableId){
        throw "Route Table ID was not given!";
    }
    if (!action.params.subnetId && !action.params.gatewayId){
        throw "You need to provide a Subnet ID or a Gateway ID!";
    }
    if (action.params.subnetId){
        params.SubnetId = (action.params.subnetId || "").trim();
    }
    if (action.params.gatewayId){
        params.GatewayId = (action.params.gatewayId || "").trim();
    }
    return runEc2Func(action, settings, params, "associateRouteTable");
}

async function attachInternetGateway(action, settings) {
    const params = {
        InternetGatewayId: (action.params.gatewayId || "").trim(),
        VpcId: (action.params.vpcId || "").trim(),
        DryRun: action.params.dryRun || false
    };
    if (!action.params.vpcId || !action.params.gatewayId){
        throw "You need to provide a Subnet ID or a Gateway ID!";
    }
    return runEc2Func(action, settings, params, "attachInternetGateway");
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
    // auto complete
    getInstanceTypes,
    getRegions
};
