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

## Method: Create VPC

**Description**

Creates a VPC with the specified IPv4 CIDR block. This method calls ec2 [createVpc](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#createVpc-property)

**Parameters**
1. Access Key (Vault) **Optional** - Used to authenticate to AWS.
2. Secret Key (Vault) **Optional** - Used to authenticate to AWS.
3. Region (Options) **Required** - The region to create the VPC in.
4. CIDR Block (String) **Optional** - The IPv4 network range for the VPC, in CIDR notation. For example, 10.0.0.0/16.
5. Amazon Provided Blocks (Boolean) **Optional** - Requests an Amazon-provided IPv6 CIDR block with a /56 prefix length for the VPC. You cannot specify the range of IP addresses, or the size of the CIDR block.
6. Instance Tenancy (Options) **Optional** - The tenancy options for instances launched into the VPC. value can be "default" or ."dedicated".
7. Subnet CIDR Block (String) **Optional** - If specified create a simple subnet within the VPC with the provided IP addresses. Value should ne IPv4 address range, in CIDR notation. The Ip address range must be included within the range of ip addresses for the VPC.
8. Nat Gateway Allocation ID (String) **Optional** - Only relevent if Subnet CIDR Block was provided. If specified, create a NAT Gateway within the subnet created in the VPC, with the Elastic IP address of the specified Allocation.
9. Create Internet Gateway (Boolean) **Optional** - If true, create an Internet gateway and attach it to the specified VPC. Default value is false.
10. Create Route Table (Boolean) **Optional** - If true, create a Route Table inside this VPC. If a subnet or an internet gateway were also created automatically, associate the route table with whoever was created. Default value is false.
11. Create Security Group (Boolean) **Optional** - If true, create a VPC-Security group, for this VPC. Default value is false.
12. Tags (Array of objects/Text) **Optional** - If specified, tag all resources created(At least the VPC, more if checked the create box for any other resource) with the tags specified. Each tag should either be in the format of Key=Value or just Key. To enter multiple values seperate each with a new line. Also accepts getting an array of objects in the form of { Key, Value } or { Key }. 
13. Dry Run (Boolean) **Optional** - If specified, don't make any changes, just check if you have sufficant permissions to do this action. Default value is false.
* **Please Notice!** It is required to pass either the 'CIDR Block' parameter or to pass true in the 'Amazon Provided Blocks' parameter

## Method: Delete VPC

**Description**

Deletes the specified VPC. You must detach or delete all gateways and resources that are associated with the VPC before you can delete it. This method calls ec2 [deleteVpc](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteVpc-property)

**Parameters**
1. Access Key - This is a parameter taken from the vault to access AWS
2. Secret Key - This is a paramer taken from the vault to access AWS
3. Region 
4. VPC ID - The ID of the VPC.
6. DryRun (boolean) - hecks whether you have the required permissions for the action, without actually making the request, and provides an error response.

## Method: Create Subnet

**Description**

Create a subnet within a VPC. This method calls ec2 [createSubnet](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#createSubnet-property)

**Parameters**
1. Access Key (Vault) **Optional** - Used to authenticate to AWS.
2. Secret Key (Vault) **Optional** - Used to authenticate to AWS.
3. Region (Options) **Required** - The region to create this Subnet in.
4. VPC ID (String) **Required** - The ID of the VPC of the subnet to create.
5. Availability Zone (String) **Optional** - The Availability Zone or Local Zone for the subnet. **Default(if not provided):** AWS selects one for you. If you create more than one subnet in your VPC, AWS does not necessarily select a different zone for each subnet.
To create a subnet in a Local Zone, set this value to the Local Zone ID, for example us-west-2-lax-1a. For information about the Regions that support Local Zones, see Available Regions in the Amazon Elastic Compute Cloud User Guide. To create a subnet in an Outpost, set this value to the Availability Zone for the Outpost and specify the Outpost ARN.
6. CIDR Block (String) **Optional** - The IPv4 network range for the subnet, in CIDR notation. For example, 10.0.0.0/24.
7. IPv6 CIDR Block (String) **Optional** - The IPv6 network range for the subnet, in CIDR notation. The subnet size must use a /64 prefix length.
8. Outpost Arn (String) **Optional** - The Amazon Resource Name (ARN) of the Outpost. If you specify an Outpost ARN, you must also specify the Availability Zone of the Outpost subnet.
9. Nat Gateway Allocation ID (String) **Optional** - If specified, create a NAT Gateway within the subnet created, with the Elastic IP address of the specified Allocation.
10. Tags (Array of objects/Text) **Optional** - If specified, tag all resources created(Subnet and maybe Nat Gateway) with the tags specified. Each tag should either be in the format of Key=Value or just Key. To enter multiple values seperate each with a new line. Also accepts getting an array of objects in the form of { Key, Value } or { Key }. 
11. Dry Run (Boolean) **Optional** - If specified, don't make any changes, just check if you have sufficant permissions to do this action. Default value is false.

## Method: Delete Subnet

**Description**

Deletes the specified subnet. You must terminate all running instances in the subnet before you can delete the subnet. This method calls ec2 [deleteSubnet](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteSubnet-property)

**Parameters**
1. Access Key - This is a parameter taken from the vault to access AWS
2. Secret Key - This is a paramer taken from the vault to access AWS
3. Region 
4. Subnet ID - The ID of the subnet.
5. DryRun (boolean) - hecks whether you have the required permissions for the action, without actually making the request, and provides an error response.

## Method: Modify Instance Type

**Description**

Modify the instance type of the instance(s) specified. You must stop all instance(s) specified before you can modify their instance type. This method calls ec2 [ModifyInstanceAttribute](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#modifyInstanceAttribute-property)

**Parameters**
1. Access Key - This is a parameter taken from the vault to access AWS
2. Secret Key - This is a paramer taken from the vault to access AWS
3. Region 
4. Instance IDs - Instance IDs of all instances you want to modify. Accecpts either a string with one or multiple instance IDs, each seperated with a new line,
    or an Array of instance IDs strings passed from code.
5. instanceType - The new [Instance Type](https://aws.amazon.com/ec2/instance-types/) to modify all specified instances to. 

## Method: Create Internet Gateway

**Description**

Create a new Internet Gateway. This method calls ec2 [createInternetGateway](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#createInternetGateway-property)

**Parameters**
1. Access Key (Vault) **Optional** - Used to authenticate to AWS.
2. Secret Key (Vault) **Optional** - Used to authenticate to AWS.
3. Region (AutoComplete) **Required** - The region to create this Internet Gateway in.
4. VPC ID (String) **Optional** - If specified, attach the newly created Internet Gateway to the specified VPC.
5. Tags (Array of objects/Text) **Optional** - If specified, tag the Internet Gateway with the tags specified. Each tag should either be in the format of Key=Value or just Key. To enter multiple values seperate each with a new line. Also accepts getting an array of objects in the form of { Key, Value } or { Key }. 
6. Dry Run (Boolean) **Optional** - If specified, don't make any changes, just check if you have sufficant permissions to do this action. Default value is false.

## Method: Create Route Table

**Description**

Create a route table in the VPC specified. This method calls ec2 [createRouteTable](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#createRouteTable-property)

**Parameters**
1. Access Key (Vault) **Optional** - Used to authenticate to AWS.
2. Secret Key (Vault) **Optional** - Used to authenticate to AWS.
3. Region (AutoComplete) **Required** - The region to create this Route Table in.
4. VPC ID (String) **Required** - The VPC to create this Route Table in.
5. Subnet ID (String) **Optional** - If specified, associate the created Route Table with the specified Subnet.
6. Gateway ID (String) **Optional** - If specified, associate the created Route Table with the specified Internet Gateway.
7. Tags (Array of objects/Text) **Optional** - If specified, tag the Route Table with the tags specified. Each tag should either be in the format of Key=Value or just Key. To enter multiple values seperate each with a new line. Also accepts getting an array of objects in the form of { Key, Value } or { Key }. 
8. Dry Run (Boolean) **Optional** - If specified, don't make any changes, just check if you have sufficant permissions to do this action. Default value is false.

## Method: Create NAT Gateway

**Description**

Create a NAT Gateway in the VPC specified. This method calls ec2 [createNatGateway](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#createNatGateway-property)

**Parameters**
1. Access Key (Vault) **Optional** - Used to authenticate to AWS.
2. Secret Key (Vault) **Optional** - Used to authenticate to AWS.
3. Region (AutoComplete) **Required** - The region to create this NAT Gateway in.
4. Subnet ID (String) **Required** - The subnet to create this NAT Gateway in.
5. Allocation ID (String) **Required** - The allocation ID of an Elastic IP address to associate with the NAT gateway. If the Elastic IP address is associated with another resource, you must first disassociate it.
6. Tags (Array of objects/Text) **Optional** - If specified, tag the NAT Gateway with the tags specified. Each tag should either be in the format of Key=Value or just Key. To enter multiple values seperate each with a new line. Also accepts getting an array of objects in the form of { Key, Value } or { Key }. 
7. Dry Run (Boolean) **Optional** - If specified, don't make any changes, just check if you have sufficant permissions to do this action. Default value is false.

## Method: Create Security Group

**Description**

Create a new Security Group. This method calls ec2 [createSecurityGroup](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#createSecurityGroup-property)

**Parameters**
1. Access Key (Vault) **Optional** - Used to authenticate to AWS.
2. Secret Key (Vault) **Optional** - Used to authenticate to AWS.
3. Region (AutoComplete) **Required** - The region to create this Security Group in.
4. Name (String) **Required** - The name of the new security group to create.
5. Description (Text) **Required** - The description of the security group.
6. VPC ID (String) **Optional** - The ID of the VPC. Required for EC2-VPC Security Group.
7. Tags (Array of objects/Text) **Optional** - If specified, tag the Security Group with the tags specified. Each tag should either be in the format of Key=Value or just Key. To enter multiple values seperate each with a new line. Also accepts getting an array of objects in the form of { Key, Value } or { Key }. 
8. Dry Run (Boolean) **Optional** - If specified, don't make any changes, just check if you have sufficant permissions to do this action. Default value is false.

## Method: Associate Route Table

**Description**

Associate the specified route table with either a subnet or an internet gateway or both. This method calls ec2 [associateRouteTable](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#associateRouteTable-property). The original method only supports associating a subnet or a gateway, so this method can call the original method up to two times.

**Parameters**
1. Access Key (Vault) **Optional** - Used to authenticate to AWS.
2. Secret Key (Vault) **Optional** - Used to authenticate to AWS.
3. Region (AutoComplete) **Required** - The region to create this Security Group in.
4. Route Table ID (String) **Required** - The ID of the route table to associate.
5. Subnet ID (String) **Optional** - If specified, associate the route table with the specified subnet.
6. Gateway ID (String) **Optional** - If specified, associate the route table with the specified internet gateway.
7. Dry Run (Boolean) **Optional** - If specified, don't make any changes, just check if you have sufficant permissions to do this action. Default value is false.

## Method: Attach Internet Gateway

**Description**

Attach the specified Internet Gateway with a VPC. This method calls ec2 [attachInternetGateway](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#attachInternetGateway-property).

**Parameters**
1. Access Key (Vault) **Optional** - Used to authenticate to AWS.
2. Secret Key (Vault) **Optional** - Used to authenticate to AWS.
3. Region (AutoComplete) **Required** - The region to create this Security Group in.
4. Gateway ID (String) **Required** - The ID of the internet gateway to attach to the VPC.
5. VPC ID (String) **Required** - The ID of the VPC to attach the internet gateway to.
6. Dry Run (Boolean) **Optional** - If specified, don't make any changes, just check if you have sufficant permissions to do this action. Default value is false.