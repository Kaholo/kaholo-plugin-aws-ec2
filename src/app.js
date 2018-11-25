const aws = require("aws-sdk");

function createInstance(action) {
    return new Promise((resolve, reject) => {
        aws.config.update({
            region: action.params.REGION,
            accessKeyId: action.params.AWS_ACCESS_KEY_ID,
            secretAccessKey: action.params.AWS_SECRET_ACCESS_KEY
        });

        let params = {
            ImageId: action.params.IMAGE_ID,
            InstanceType: action.params.INSTANCE_TYPE,
            MinCount: parseInt(action.params.MIN_COUNT || 1),
            MaxCount: parseInt(action.params.MAX_COUNT || 1),
            KeyName : action.params.KEY_NAME,
            SecurityGroupIds: action.params.SECURITY_GROUP_IDS,
            UserData : action.params.USER_DATA
        };

        let ec2 = new aws.EC2();

        ec2.runInstances(params, function (err, data) {
            if (err) {
                return reject("Could not create instance: " + err);
            }
            let instanceId = data.Instances[0].InstanceId;
            console.log("Created instance", instanceId);
            // Add tags to the instance
            if (action.params.TAGS) {
                try {
                    let tags = JSON.parse(action.params.TAGS);
                    let tagsParams = { Resources: [instanceId], Tags: tags };

                    ec2.createTags(tagsParams, function (err) {
                        console.log("Tagging instance", err ? "failure" : "success");
                    });
                } catch (e) {
                    console.log("Error tagging instance");
                }
            }

            return resolve(data);
        });
    });
}

function manageInstances(action) {
    return new Promise((resolve, reject) => {
        aws.config.update({
            region: action.params.REGION,
            accessKeyId: action.params.AWS_ACCESS_KEY_ID,
            secretAccessKey: action.params.AWS_SECRET_ACCESS_KEY
        });

        let ids;
        try {
            ids = JSON.parse(action.params.INSTANCE_IDS);
        }
        catch (e) {
            return reject("Error parsing instance ids: ", e);
        }

        let params = {
            InstanceIds: ids,
            DryRun: true // se the DryRun parameter to test whether you have permission before actually attempting to start or stop the selected instances.
        };

        // Create EC2 service object
        ec2 = new AWS.EC2();

        if (action.method.name === "startInstances") {
            // call EC2 to start the selected instances
            ec2.startInstances(params, function (err, data) {
                if (err && err.code === 'DryRunOperation') {
                    params.DryRun = false;
                    ec2.startInstances(params, function (err, data) {
                        if (err) {
                            return reject("Error while trying to start instances: " + err);
                        } else if (data) {
                            return resolve("Success: " + data.StartingInstances);
                        } else {
                            console.log("Finish without data");
                        }
                    });
                } else {
                    return reject("You don't have permission to start instances.");
                }
            });
        } else if (action.method.name === "stopInstances") {
            // call EC2 to stop the selected instances
            ec2.stopInstances(params, function (err, data) {
                if (err && err.code === 'DryRunOperation') {
                    params.DryRun = false;
                    ec2.stopInstances(params, function (err, data) {
                        if (err) {
                            return reject("Error while trying to stop instances: " + err);
                        } else if (data) {
                            return resolve("Success: " + data.StoppingInstances);
                        } else {
                            console.log("Finish without data");
                        }
                    });
                } else {
                    return reject("You don't have permission to stop instances");
                }
            });
        } else if (action.method.name === "rebootInstances") {
            // call EC2 to reboot instances
            ec2.rebootInstances(params, function (err, data) {
                if (err && err.code === 'DryRunOperation') {
                    params.DryRun = false;
                    ec2.rebootInstances(params, function (err, data) {
                        if (err) {
                            return reject("Error while trying to stop instances: " + err);
                        } else if (data) {
                            return resolve("Success: " + data);
                        } else {
                            console.log("Finish without data");
                        }
                    });
                } else {
                    return reject("You don't have permission to reboot instances.");
                }
            });
        }
    });
}

function manageKeyPairs(action) {
    return new Promise((resolve, reject) => {
        aws.config.update({
            region: action.params.REGION,
            accessKeyId: action.params.AWS_ACCESS_KEY_ID,
            secretAccessKey: action.params.AWS_SECRET_ACCESS_KEY
        });

        // Create EC2 service object
        let ec2 = new aws.EC2({ apiVersion: '2016-11-15' });


        if (action.method.name === "describeKeyPairs") {
            // Retrieve key pair descriptions; no params needed
            ec2.describeKeyPairs(function (err, data) {
                if (err) {
                    return reject("Error describing key pair: " + err);
                } else {
                    return resolve(JSON.stringify(data.KeyPairs));
                }
            });
        }
        let params = {
            KeyName: action.params.KEY_PAIR_NAME
        };

        if (action.method.name === "createKeyPair") {
            // Create the key pair
            ec2.createKeyPair(params, function (err, data) {
                if (err) {
                    return reject("Error creating key pair: " + err);
                } else {
                    return resolve(JSON.stringify(data));
                }
            });
        } else if (action.method.name === "deleteKeyPair") {
            ec2.deleteKeyPair(params, function (err, data) {
                if (err) {
                    return reject("Error deleting key pair: " + err);
                } else {
                    return resolve("Key Pair Deleted");
                }
            });
        }

    });
}


module.exports = {
    createInstance: createInstance,
    startInstances: manageInstances,
    stopInstances: manageInstances,
    rebootInstances: manageInstances,
    describeKeyPairs: manageKeyPairs,
    createKeyPair: manageKeyPairs,
    deleteKeyPair: manageKeyPairs
};
