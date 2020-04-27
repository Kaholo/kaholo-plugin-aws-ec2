const helpers = require('./helpers');

function createInstance(action, settings) {
    return new Promise((resolve, reject) => {
        const ec2 = helpers.getEc2(action, settings);

        let params = {
            ImageId: action.params.IMAGE_ID,
            InstanceType: action.params.INSTANCE_TYPE,
            MinCount: parseInt(action.params.MIN_COUNT || 1),
            MaxCount: parseInt(action.params.MAX_COUNT || 1),
            KeyName: action.params.KEY_NAME,
            SecurityGroupIds: action.params.SECURITY_GROUP_IDS,
            UserData: action.params.USER_DATA
        };

        if (action.params.TAGS_SPECIFICATION) {
            let tags = helpers.handleParams(action.params.TAGS_SPECIFICATION);
            params.TagSpecifications = [{ ResourceType: "instance", Tags: tags }]
        }

        ec2.runInstances(params, helpers.operationCallback(resolve,reject));
    });
}

function terminateInstances(action, settings) {
    return new Promise((resolve, reject) => {
        if (action.params.INSTANCE_IDS){
            return reject("You must specify instance IDs");
        }
        
        const ec2 = helpers.getEc2(action, settings);

        let ids = helpers.handleParams(action.params.INSTANCE_IDS);
        if (!Array.isArray(ids))
            return reject("Instance ids must be an array");
        
        ec2.terminateInstances({InstanceIds : ids}, helpers.operationCallback(resolve,reject));
    });
}

function manageInstances(action, settings) {
    return new Promise((resolve, reject) => {
        const ec2 = helpers.getEc2(action, settings);
        const callback = helpers.operationCallback(resolve,reject);
        let ids = helpers.handleParams(action.params.INSTANCE_IDS);
        
        if (!Array.isArray(ids))
            return reject("Instance ids must be an array");

        let params = {
            InstanceIds: ids
        };

        if (action.method.name === "startInstances") {
            // call EC2 to start the selected instances
            ec2.startInstances(params, callback);
        } else if (action.method.name === "stopInstances") {
            // call EC2 to stop the selected instances
            ec2.stopInstances(params, callback);
        } else if (action.method.name === "rebootInstances") {
            // call EC2 to reboot instances
            ec2.rebootInstances(params, callback);
        }
    });
}

function manageKeyPairs(action, settings) {
    return new Promise((resolve, reject) => {
        const ec2 = helpers.getEc2(action, settings);
        const callback = helpers.operationCallback(resolve,reject);
        if (action.method.name === "describeKeyPairs") {
            // Retrieve key pair descriptions; no params needed
            ec2.describeKeyPairs(callback);
        }
        let params = {
            KeyName: action.params.KEY_PAIR_NAME
        };
        if (action.method.name === "createKeyPair") {
            // Create the key pair
            ec2.createKeyPair(params, callback);
        } else if (action.method.name === "deleteKeyPair") {
            ec2.deleteKeyPair(params, callback);
        }

    });
}

function allocateAddress(action, settings) {
    return new Promise((resolve, reject) => {
        const ec2 = helpers.getEc2(action, settings);
        let params = {
            Domain: action.params.DOMAIN,
            Address: action.params.ADDRESS,
            PublicIpv4Pool: action.params.PUBLICIPV4POOL,
            DryRun: action.params.DRYRUN
        };

        ec2.allocateAddress(params, helpers.operationCallback(resolve,reject));
    })
}

function associateAddress(action, settings) {
    return new Promise((resolve, reject) => {
        const ec2 = helpers.getEc2(action, settings);
        let params = {
            AllocationId: action.params.ALLOCATION_ID,
            InstanceId: action.params.INSTANCE_ID,
            PublicIp: action.params.PUBLIC_IP,
            AllowReassociation: action.params.ALLOWREASSOCIATION,
            DryRun: action.params.DRYRUN,
            NetworkInterfaceId: action.params.NETWORK_INTERFACE_ID,
            PrivateIpAddress: action.params.PRIVATE_IP_ADDRESS
        }

        ec2.associateAddress(params, helpers.operationCallback(resolve,reject));
    })
}

function releaseAddress(action, settings) {
    return new Promise((resolve, reject) => {
        const ec2 = helpers.getEc2(action, settings);
        let params = {
            AllocationId: action.params.ALLOCATION_ID,
            PublicIp: action.params.PUBLIC_IP,
            DryRun: action.params.DRYRUN
        }
        ec2.releaseAddress(params, helpers.operationCallback(resolve,reject));
    })
}

function describeInstances(action, settings) {
    return new Promise((resolve, reject) => {
        const ec2 = helpers.getEc2(action, settings);
        let params = {
            DryRun: action.params.DRYRUN,
            MaxResults: action.params.MAX_RESULTS,
            NextToken: action.params.NEXT_TOKEN
        }

        if (action.params.INSTANCE_IDS) {
            let ids = helpers.handleParams(action.params.INSTANCE_IDS);
            if (!Array.isArray(ids))
                return reject("Instance ids must be an array");
            params.InstanceIds = ids;
        }

        if (action.params.filters) {
            if (!Array.isArray(action.params.filters))
                return reject("Filters ids must be an array");
            params.Filters = action.params.filters;
        }

        ec2.describeInstances(params, helpers.operationCallback(resolve,reject));
    })
}

function createVpc(action, settings) {
    return new Promise((resolve, reject) => {
        const ec2 = helpers.getEc2(action, settings);
        let params = {
            CidrBlock = action.params.cidrBlock,
            AmazonProvidedIpv6CidrBlock = action.params.amazonProvidedIpv6CidrBlock,
            DryRun = action.params.dryRun,
            InstanceTenancy = action.params.instanceTenancy,
        }

        ec2.createVpc(params, helpers.operationCallback(resolve,reject));
    })
}

function createSubnet(action, settings) {
    return new Promise((resolve, reject) => {
        const ec2 = helpers.getEc2(action, settings);
        let params = {
            AvailabilityZone: action.params.availabilityZone,
            CidrBlock: action.params.cidrBlock,
            Ipv6CidrBlock: action.params.ipv6CidrBlock,
            VpcId: action.params.vpcId,
            DryRun: action.params.dryRun,
        }

        ec2.createSubnet(params, helpers.operationCallback(resolve,reject));
    })
}

module.exports = {
    createInstance: createInstance,
    startInstances: manageInstances,
    stopInstances: manageInstances,
    rebootInstances: manageInstances,
    describeKeyPairs: manageKeyPairs,
    createKeyPair: manageKeyPairs,
    deleteKeyPair: manageKeyPairs,
    allocateAddress: allocateAddress,
    associateAddress: associateAddress,
    releaseAddress: releaseAddress,
    describeInstances: describeInstances,
    terminateInstances: terminateInstances,
    createVpc: createVpc,
    createSubnet: createSubnet
};
