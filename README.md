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
7. Security Group ID (array) - connect this instance to a security group. You will have to use a code (code or configuration) to transfer array to the api.
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

## Method: Stop Instance

**Description**

Stops an Amazon EBS-backed instance. This method calls ec2 [stopInstance](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#stopInstances-property)

**Parameters**
1. Access Key - This is a parameter taken from the vault to access AWS
2. Secret Key - This is a paramer taken from the vault to access AWS
3. Region
4. Instances Ids - The IDs of the instances. Can be an array of instances.

## Method: Terminate Instances

**Description**

Terminate EC2 instances. This method calls ec2 [terminateInstance](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#terminateInstances-property)

**Parameters**
1. Access Key - This is a parameter taken from the vault to access AWS
2. Secret Key - This is a paramer taken from the vault to access AWS
3. Region
4. Instances Ids - Array of Instance IDs.

## Method: Reboot Instance

**Description**

Requests a reboot of the specified instances. This operation is asynchronous; it only queues a request to reboot the specified instances. This method calls ec2 [rebootInstance](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#rebootInstances-property)

**Parameters**
1. Access Key - This is a parameter taken from the vault to access AWS
2. Secret Key - This is a paramer taken from the vault to access AWS
3. Region
4. Instances Ids - The IDs of the instances. Can be an array of instances.

## Describe Key Pair

**Description**

Describes the specified key pairs or all of your key pairs.. This method calls ec2 [describeKeyPair](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeKeyPairs-property)

**Parameters**
1. Access Key - This is a parameter taken from the vault to access AWS
2. Secret Key - This is a paramer taken from the vault to access AWS
3. Region

## Method: Create Key Pair

**Description**

This methods will create a new Key Pair This method calls ec2 [createKeyPair](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#createKeyPair-property)

**Parameters**
1. Access Key - This is a parameter taken from the vault to access AWS
2. Secret Key - This is a paramer taken from the vault to access AWS
3. Region
4. Key Pair name - the name for the new key-pair

## Method: Delete Key Pair

**Description**

This method will delete a Key Pair. This method calls ec2 [deleteKeyPair](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteKeyPair-property)

**Parameters**
1. Access Key - This is a parameter taken from the vault to access AWS
2. Secret Key - This is a paramer taken from the vault to access AWS
3. Region
4. Key Pair name - the name of the key-pair

## Method: Allocate an address

**Desciption**

Allocates an Elastic IP address to your AWS account. This method calls ec2 [allocateAddress](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#allocateAddress-property)

**Parameters**
1. Access Key - This is a parameter taken from the vault to access AWS
2. Secret Key - This is a paramer taken from the vault to access AWS
3. Region
4. Domain 
&ensp;Set to vpc to allocate the address for use with instances in a VPC\
&ensp;Default: The address is for use with instances in EC2-Classic.\
&ensp;Possible values include:\
&ensp;&ensp;- "vpc"\
&ensp;&ensp;- "standard"
5. Address - (string) The Elastic IP address to recover or an IPv4 address from an address pool.
6. PublicPV4Pool - The ID of an address pool that you own. Use this parameter to let Amazon EC2 select an address from the address pool. To specify a specific ```address``` from the address pool, use the Address parameter instead.
7. DryRun - (Boolean) Checks whether you have the required permissions for the action, without actually making the request, and provides an error response.

## Method: Associate an Address

**Desciption**

Associates an Elastic IP address with an instance or a network interface. Before you can use an Elastic IP address, you must allocate it to your account. This method calls ec2 [associateAddress](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#associateAddress-property)

**Parameters**
1. Access Key - This is a parameter taken from the vault to access AWS
2. Secret Key - This is a paramer taken from the vault to access AWS
3. Region
4. Allocation ID - The allocation ID. This is required for EC2-VPC.
5. Instance ID - The ID of the instance. This is required for EC2-Classic.
6. Public IP - The Elastic IP address to associate with the instance. This is required for EC2-Classic.
7. Allow Reassociation (Boolean) - For a VPC in an EC2-Classic account, specify true to allow an Elastic IP address that is already associated with an instance or network interface to be reassociated with the specified instance or network interface.
8. DryRun (Boolean) - Checks whether you have the required permissions for the action, without actually making the request, and provides an error response.
9. Network InterfaceID - The ID of the network interface. If the instance has more than one network interface, you must specify a network interface ID.
10. Private IP Address - The primary or secondary private IP address to associate with the Elastic IP address. 


## Method: Release an address

**Description**

Releases the specified Elastic IP address. This method calls ec2 [releaseAddress](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#releaseAddress-property)

**Parameters**

1. Access Key - This is a parameter taken from the vault to access AWS
2. Secret Key - This is a paramer taken from the vault to access AWS
3. Region 
4. Allocation ID - The allocation ID. Required for EC2-VPC.
5. Public IP - The Elastic IP address. Required for EC2-Classic.
6. DryRun (Boolean) - Checks whether you have the required permissions for the action, without actually making the request, and provides an error response.

## Method: Describe instance

**Description**

Describes the specified instances or all of AWS account's instances. This method calls ec2 [describeInstances](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeInstances-property)

**Parameters**
1. Access Key - This is a parameter taken from the vault to access AWS
2. Secret Key - This is a paramer taken from the vault to access AWS
3. Region 
4. Instance IDs - Array of instance IDs.
5. Filters - Array of filters
6. DryRun (boolean) - hecks whether you have the required permissions for the action, without actually making the request, and provides an error response.
7. Max Results - The maximum number of results to return in a single call. To retrieve the remaining results, make another call with the returned ```NextToken``` value.
8. Next Token - The token to request the next page of results
