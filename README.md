# kaholo-plugin-amazon-ec2
Amazon EC2 plugin for Kaholo
This plugin is based on [aws-sdk API](https://www.npmjs.com/package/aws-sdk) and you can view all resources on [github](https://github.com/aws/aws-sdk-js)

## Method: Create Instance

**Description**
This method will create a new AWS instance. This method calls ec2 [runInstance](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#runInstances-property)

**Parameters**
1. Access Key - This is a parameter taken from the vault to access AWS
2. Secret Key - This is a paramer taken from the vault to access AWS
3. Region - Select a region from the appeard list.
4. Image ID - If you already have an AMI ready for launch
5. Instance type - The machine type you want to launce for example: t2.micro
6. Key name - Add a key-pair in order to connect to the new server.
7. Security Group ID - connect this instance to a security group
8. User data - The user data to make available to the instance. 
9. Minimum of instances - The minimum number of instances to launch (by default 1).
10. Maximum of instances - The maximum number of instances to launch (by default 1).
11. Tags specifications - The tags to apply to the resources during launch. 

## Method: Start Instance

**Description**
Starts an Amazon EBS-backed instance that you've previously stopped.
This method calls ec2 [startinstance](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#startInstances-property)

**Parameters**
1. Access Key - This is a parameter taken from the vault to access AWS
2. Secret Key - This is a paramer taken from the vault to access AWS
3. Region - The region which you want to launch the instance.
4. Instances Ids - The IDs of the instances. Can be an array of instances.

## Stop Instance

**Description**
Stops an Amazon EBS-backed instance. This method calls ec2 [stopInstance](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#stopInstances-property)

**Parameters**
1. 
**Parameters**
