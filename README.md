# Kaholo AWS EC2 Plugin
This plugin extends Kaholo's capabilities to interact with Amazon Web Services Elastic Compute Cloud (AWS EC2). The plugin makes use of npm package [aws-sdk API](https://www.npmjs.com/package/aws-sdk) to provide methods to create, start, stop, reboot, and terminate instances, and work with related virtual assets such as VPCs, IP addresses, key pairs, gateways, route tables, volumes, snapshots, and security groups.

## Prerequisites
To use this plugin you must have an account (either root or IAM) with Amazon Web Services (AWS) with sufficient permissions to work with EC2, and a pair of Access Keys associated with that account.

## Plugin Settings
To Access Plugin Settings, click on Settings | Plugins, find the "AWS EC2" plugin, and then click on the plugin's name, which is blue hypertext. There is only one plugin-level setting for AWS EC2, the default AWS region. If you specify a region here, e.g. `ap-southeast-1`, then newly created AWS EC2 actions will inherit that region by default. This is provided only as a convenience, and each action's region can be modified after creation if the configured default is not appropriate.

## Plugin Account
This plugin makes use of a Kaholo Account to manage authentication. This allows the authentication to be configured once and then conveniently selected from a drop-down on an action-by-action basis. The security-sensitive AWS Access Keys are stored encypted in the Kaholo vault to protect them from exposure in the UI, Activity Log, Final Result, and server logs. They may be stored in the vault before or during Kaholo Account creation.

The same Kaholo Account can be used for several AWS-related Kaholo plugins. If you've already configured one, for example to use with AWS CLI Plugin, then no further account configuration is necessary.

### Account Name
Account Name is an arbitrary name to identify a specific Kaholo account. It is suggested to name it after the AWS IAM user name associated with the access keys, and/or the type(s) of AWS access granted to that user. The names of the ID and Secret components in the Vault are ideally named similarly.

### Access Key ID (Vault)
This is the Access Key ID as provided by AWS or the AWS administrator. While the ID is not technically a secret it is vaulted anyway for better security. An Access Key ID looks something like this:

    AKIA3LQJ67DUTPFST5GM

### Access Key Secret (Vault)
This is the Access Key Secret as provided by AWS or the AWS administrator. This is a genuine secret and must be vaulted in the Kaholo Vault. An Access Key Secret looks something like this:

    DByOuQgqqwUWa8Y4Wu3hE3HTWZB6+mQVt8Qs0Phv

## Method: Create Instance
This method creates one or more new AWS instances.

### Parameter: Name
This sets the "Name" tag of the new instance to make it more easily identifiable in the AWS web console.

### Parameter: Region
The AWS geographical region where instance will be created. This parameter has an autocomplete function so you may select the region using either the CLI-type ID string, for example `ap-southeast-1`, or the user-friendly location, e.g. "Asia Pacific (Singapore)". If using the code layer, use the CLI-type ID string. The availability zone, for example `ap-southeast-1a` vs `ap-southeast-1b`, is determined not by Region but by which Subnet is selected.

### Parameter: AMI
Every instance is based on an AMI image, which determines the initial operating system and software configuration of the instance. AMI images are unique to each Region and instance architecture so the AMI provided must be one available in the Region selected and must also match the instance type selected. AMI's are identified by their CLI-type ID string, for example `ami-0df7a207adb9748c7` is Ubuntu 22.04 LTS for amd64 in region `ap-southeast-1`. This AMI will not work for an ARM instance such as `a1-medium` or in a region other than `ap-southeast-1`.

### Parameter: Instance Type
Instance Type determines types and quantities of compute resources are available to the instance, including CPU, RAM, GPU, disk and network bandwidth. It also determines the cost of the instance. For example, `t4g.large` instances have 2 vCPU of Arm-based AWS Graviton2 processors and 8 GB RAM. Not all instance types are available in all regions. See the [AWS Website](https://aws.amazon.com/ec2/instance-types/) for more details about instance types.

### Parameter: Key Pair Name
Key Pairs are RSA or ED25519 public/private keys configured in AWS, each Key Pair being valid only in the region where it was configured. This plugin can also be used to create a Key Pair using method "Create Key Pair". The Key Pair specified here determines which SSH private key will have access to the instance. For Windows instances the private key is required to decrypt the Administrator password for RDP. Key Pair names are arbitrary, e.g. "Olivia's Singapore Region Keys".

### Parameter: Subnet
Subnet determines both the VPC and availability zone where the instance will be created. Only a subnet within the specified Region will work for this parameter. Subnet choice also has effects such as which routes are available and whether or not an instance gets an external IP address. A subnet is identified by its CLI-type ID string, e.g. `subnet-07da61f7da6132651`.

### Parameter: Security Groups
Security Groups are sets of firewall rules configured in AWS. The specified Security Group(s) must match the VPC of the specified Subnet. A security group is identified by its CLI-type ID string, e.g. `sg-0332f2a6e5c4be523`.

### Parameter: Tags Specification
Tags other than or including "Name" may be optionally specified here as one-per-line key=value pairs. Tags are used to logically organize instances for various reasons. For more information see the [AWS Documentation on Tags](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Tags.html).

### Parameter: User Data
User Data is up to 16Kb of base64-encoded data that is typically some kind of initial configuration or startup instructions for the new instance. For more information about user data see the [AWS Documentation on User Data](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-add-user-data.html).

### Parameter: Minimum Instances
If launching more than one or a variable number of instances this is the minimum quantity of instances to launch.

### Parameter: Maximum Instances
If launching more than one or a variable number of instances this is the maximum quantity of instances to launch.

## Method: Start Instances
This method starts one or more AWS EC2 instances.

### Parameter: Instance IDs
The instance ID of the instance(s) to be started. To start more than one instance, list their instance IDs one per line. If using the code layer pass the list of instances as an array of strings.

## Method: Stop Instances
This method stops one or more AWS EC2 instances.

### Parameter: Instance IDs
The instance ID of the instance(s) to be stopped. To stop more than one instance, list their instance IDs one per line. If using the code layer pass the list of instances as an array of strings.

## Method: Reboot Instances
This method reboots one or more AWS EC2 instances.

### Parameter: Instance IDs
The instance ID of the instance(s) to be rebooted. To reboot more than one instance, list their instance IDs one per line. If using the code layer pass the list of instances as an array of strings.

## Method: Terminate Instances
This method terminates one or more AWS EC2 instances. Termination is the shutdown and deletion of an instance.

### Parameter: Instance IDs
The instance ID of the instance(s) to be terminated. To terminate more than one instance, list their instance IDs one per line. If using the code layer pass the list of instances as an array of strings.

## Method: Describe Key Pairs
This method describes all existing Key Pairs. Key Pairs are a paired set of either RSA or ED25519 public/private encryption keys used to control SSH access and decrypt Windows passwords. The private key is held by an individual user and the public key is held by AWS. The pair is given a user-friendly name, `KeyName`, which is used in key-related methods of this plugin.

The described Key Pairs do NOT include the private key, because AWS has no record of the private key. If the private key has been lost, it must be replaced with a new Key Pair using the methods [documented by AWS](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/TroubleshootingInstancesConnecting.html#replacing-lost-key-pair). Alternatively, if the private key has been added to the Kaholo Vault, it may be recoverable from there. [Contact Kaholo](https://kaholo.io/contact/) for details.

An example Key Pair:

    KeyPairId: "key-03bef99f4306a0da0"
    KeyFingerprint: "78:6a:18:a9:9c:3b:85:18:75:41:27:35:85:5b:e2:ce:34:a5:c7:26"
    KeyName: "test alpha"
    KeyType: "rsa"

## Method: Create Key Pair
This method creates a new Key Pair. Upon creation the private key, or `KeyMaterial`, of the Key Pair is provided only once in Final Result. The private key is meant to be a secret guarded by an individual user. AWS retains no record of the private key so if lost the Key Pair becomes useless. Using this method, the private key gets recorded in the Final result of the Kaholo execution. If that presents a security risk ensure your pipeline manages it, e.g. delete the Key Pair and instances that use it when the pipeline has finished, or ensure the instances and/or Kaholo Final Result are sufficiently low-risk and/or protected from access by would-be attackers. To avoid risk entirely use the AWS Web Console or command-line CLI to create new Key Pairs instead.

### Parameter: Key Pair Name
This is an arbitrary user-friendly name for the new Key Pair, e.g. "DevOps Admin (East Region)"

## Method: Delete Key Pair
This method deletes a Key Pair. The corresponding private key will continue to work for existing instances, but new instances will be unable to use the deleted Key. This is reversible - if the private key exists it can be used to generate a public key which can be imported to AWS as a Key Pair with the same KeyName as the previously deleted Key Pair.

### Parameter: Key Pair Name
This is the user-friendly name for the Key Pair to be deleted, property `KeyName`.

## Method: Allocate an address

**Desciption**

Allocates an Elastic IP address to your AWS account. This method calls ec2 [allocateAddress](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#allocateAddress-property)

**Parameters**
1. Access Key - This is a parameter taken from the vault to access AWS
2. Secret Key - This is a paramer taken from the vault to access AWS
3. Region
4. Domain Type (options) - The type of domain to allocate the address for. Can either be standard for regular ec2 instances, or "VPN" if it's for an instance inside a VPN.
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
7. Create Internet Gateway (Boolean) **Optional** - If true, create an Internet gateway and attach it to the specified VPC. Default value is false.
8. Create Route Table (Boolean) **Optional** - If true, create a Route Table inside this VPC. If a subnet or an internet gateway were also created automatically, associate the route table with whoever was created. Default value is false.
9. Create Security Group (Boolean) **Optional** - If true, create a VPC-Security group, for this VPC. Default value is false.
10. Tags (Array of objects/Text) **Optional** - If specified, tag all resources created(At least the VPC, more if checked the create box for any other resource) with the tags specified. Each tag should either be in the format of Key=Value or just Key. To enter multiple values seperate each with a new line. Also accepts getting an array of objects in the form of { Key, Value } or { Key }. 
11. Dry Run (Boolean) **Optional** - If specified, don't make any changes, just check if you have sufficant permissions to do this action. Default value is false.
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
5. Route Table ID (String) **Optional** - If specified, assoicate the subnet with the specified Route Table. **Doesn't work together with the parameter 'Create Private Route Table'**.
6. Availability Zone (String) **Optional** - The Availability Zone or Local Zone for the subnet. **Default(if not provided):** AWS selects one for you. If you create more than one subnet in your VPC, AWS does not necessarily select a different zone for each subnet.
To create a subnet in a Local Zone, set this value to the Local Zone ID, for example us-west-2-lax-1a. For information about the Regions that support Local Zones, see Available Regions in the Amazon Elastic Compute Cloud User Guide. To create a subnet in an Outpost, set this value to the Availability Zone for the Outpost and specify the Outpost ARN.
7. CIDR Block (String) **Optional** - The IPv4 network range for the subnet, in CIDR notation. For example, 10.0.0.0/24.
8. IPv6 CIDR Block (String) **Optional** - The IPv6 network range for the subnet, in CIDR notation. The subnet size must use a /64 prefix length.
9. Outpost Arn (String) **Optional** - The Amazon Resource Name (ARN) of the Outpost. If you specify an Outpost ARN, you must also specify the Availability Zone of the Outpost subnet.
10. Nat Gateway Allocation ID (String) **Optional** - If specified, create a NAT Gateway within the subnet created, with the Elastic IP address of the specified Allocation.
11. Create Private Route Table (Boolean) **Optional** - If specified create a new route table and connect it to the subnet.
In case a NAT Gateway was also created from this function, also create a default route from the route table to the NAT Gateway. This proccess needs to wait for the NAT Gateway to be available which **might take a couple of minutes!**
12. Map Public IP On Launch (Boolean) **Optional** - If specified modify the attribute 'Map Public IP On Launch' on the subnet to true, using this command: [documentaion](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.Ifhtml#modifySubnetAttribute-property). The subnet will map a public ip address to any instance launched from it.
13. Tags (Array of objects/Text) **Optional** - If specified, tag all resources created(Subnet and maybe Nat Gateway) with the tags specified. Each tag should either be in the format of Key=Value or just Key. To enter multiple values seperate each with a new line. Also accepts getting an array of objects in the form of { Key, Value } or { Key }. 
14. Dry Run (Boolean) **Optional** - If specified, don't make any changes, just check if you have sufficant permissions to do this action. Default value is false.

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
4. Instance IDs - Instance IDs of all instances you want to modify. Accepts either a string with one or multiple instance IDs, each seperated with a new line,
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

## Method: Add Security Group Rules

**Description**

Creates new rules for the specified security group. Can be either Ingress/Egrass type rule and also either Authorize\Revoke type. This method calls one of the following ec2 methods:
* [authorizeSecurityGroupIngress](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#authorizeSecurityGroupIngress-property)
* [authorizeSecurityGroupEgress](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#authorizeSecurityGroupEgress-property)
* [revokeSecurityGroupIngress](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#revokeSecurityGroupIngress-property)
* [revokeSecurityGroupEgress](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#revokeSecurityGroupEgress-property)

**Parameters**
1. Access Key (Vault) **Optional** - Used to authenticate to AWS.
2. Secret Key (Vault) **Optional** - Used to authenticate to AWS.
3. Region (AutoComplete) **Required** - The region to create this Security Group in.
4. Group ID (String) **Required** - The ID of security group to add the rules to.
5. Rule Type (Options) **Optional** - The type of rules to create.
Possible Values are: Ingress-Authorize/Egress-Authorize/Ingress-Revoke/Egress-Revoke. Default Value is Ingress-Authorize.
6. CIDR IPv4 Blocks (Text) **Optional** - The IP v4 ranges in CIDR notation to apply to the rule(To autorize\revoke). To enter multiple values seperate each with a new line.
7. CIDR IPv4 Blocks (Text) **Optional** - The IP v6 ranges in CIDR notation to apply to the rule(To autorize\revoke). To enter multiple values seperate each with a new line.
6. From Ports (Text) **Required** - The source ports to apply the rule to. To enter multiple values seperate each with a new line.
7. To Ports (Text) **Required** - The target ports to apply the rule to. To enter multiple values seperate each with a new line.
If specified the same number of ports as 'From Ports' map each port in 'From Ports' to a port specified here. If not, map each port on 'From Ports' to all ports specified here. **For example**: 
* From Ports: 22, 80. To Ports: 22, 80. => 2 rules, 22->22, 80->80.
* From Ports: 80, 8080. To Ports: 80. => 2 rules, 80->80, 8080->80.
8. Ip Protocol (String) **Required** - The IP Protocol to apply to this rule(either authrize\revoke access for this protocol).
9. Description (Text) **Optional** - The description of the rules created.
10. Dry Run (Boolean) **Optional** - If specified, don't make any changes, just check if you have sufficant permissions to do this action. Default value is false.

## Method: Create Route

**Description**

Create a new route inside the specified Route Table. This method calls ec2 [createRoute](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#createRoute-property).

**Parameters**
1. Access Key (Vault) **Optional** - Used to authenticate to AWS.
2. Secret Key (Vault) **Optional** - Used to authenticate to AWS.
3. Region (AutoComplete) **Required** - The region to create this Security Group in.
4. Route Table ID (String) **Required** - The ID of the route table to create the route in.
5. Gateway ID (String) **Optional** - ID of an internet gateway. If specified make the Internet Gateway specified the target of the route.
6. NAT Gateway ID (String) **Optional** - ID of a NAT gateway. If specified make the NAT Gateway specified the target of the route.
7. Instance ID (String) **Optional** - ID of an Instance. If specified make the Instance specified the target of the route.
8. Destination CIDR Block **Required** - This route will target all IPv4 addresses in the specified IP block.
8. Dry Run (Boolean) **Optional** - If specified, don't make any changes, just check if you have sufficant permissions to do this action. Default value is false.
**Can only accepot one of paramaters 5-7**

## Method: Create Volume
Create a new volume in the specified availability zone or outpost.

## Parameters
1. Access key (Vault) **Required if not in settings** - The Access Key ID to use to authenticate to AWS for this request.
2. Secret key (Vault) **Required if not in settings** - The Access Key Secret to use to authenticate to AWS for this request.
3. Region (Autocomplete) **Required** - The region to execute the request in.
4. Availability Zone (String) **Required if no outpost specified** - The Availability Zone to execute the requestin which to create the volume.
5. Volume Type (Options) **Required** - The volume type. Possible values: **Standard | io1 | io2 | gp2 | sc1 | st1 | gp3**.
Volume types are:
* General Purpose SSD: gp2 | gp3
* Provisioned IOPS SSD: io1 | io2
* Throughput Optimized HDD: st1
* Cold HDD: sc1
* Magnetic: standard
6. Size(In GBs) (String) **Required if no snapshot specified** - The size of the volume, in GBs. You must specify either a snapshot ID or a volume size. If you specify a snapshot, the default is the snapshot size. You can specify a volume size that is equal to or larger than the snapshot size.
7. IOPS (String) **Required for volume types: io1, io2 and gp3** - The number of I/O operations per second (IOPS).
8. Create From Snapshot(ID) (String) **Required if no size provided** - If specified create the volume from the snapshot specified.
9. Outpost ARN (String) **Optional** - If specified create the volume on the outpost specified.
10. Throughput (String) **Optional** - This parameter is valid only for gp3 volumes. The throughput to provision for the volume, with a maximum of 1,000 MiB/s.
11. Is Encrypted (Boolean) **Optional** - Indicates Whether to encrypt the volume or not. Encryption type depends on the volume origin (new or from a snapshot), starting encryption state, ownership, and whether encryption by default is enabled.
12. KMS Key ID (String) **Optional** - The identifier of the Key Management Service (KMS) KMS key to use for Amazon EBS encryption. If this parameter is not specified, your KMS key for Amazon EBS is used. If KmsKeyId is specified, the encrypted state must be true. You can specify the KMS key using any of the following: Key ID | Key alias | Key ARN | Alias ARN
13. Multi Attach Enabled (Boolean) **Optional** - Indicates whether to enable Amazon EBS Multi-Attach. If you enable Multi-Attach, you can attach the volume to up to 16 Instances built on the Nitro System in the same Availability Zone. This parameter is supported with io1 and io2 volumes only.
14. Dry Run (Boolean) **Optional** - Checks whether you have the required permissions for the action, without actually making the request, and provides an error response. If you have the required permissions, the error response is DryRunOperation. Otherwise, it is UnauthorizedOperation.
15. Wait Until Operation End (Boolean) **Optional** - If true wait until the end of the operation. The operation ends when the volume is ready.

## Method: Create EBS Snapshot
Create a new snapshot of the specified EBS volume.

## Parameters
1. Access key (Vault) **Required if not in settings** - The Access Key ID to use to authenticate to AWS for this request.
2. Secret key (Vault) **Required if not in settings** - The Access Key Secret to use to authenticate to AWS for this request.
3. Region (Autocomplete) **Required** - The region to execute the request in.
4. Volume ID (String) **Required** - The ID of the volume to create the snapshot of.
5. Description (Text) **Optional** - A description for the snapshot.
6. Outpost ARN (String) **Optional** - If specified, create the snapshot on the outpost specified. Not related to the outpost the volume is stored on.
7. Dry Run (Boolean) **Optional** - Checks whether you have the required permissions for the action, without actually making the request, and provides an error response. If you have the required permissions, the error response is DryRunOperation. Otherwise, it is UnauthorizedOperation.
8. Wait Until Operation End (Boolean) **Optional** - If true wait until the end of the operation. The operation ends when the snapshot is completed.

## Method: Modify Instance Attribute
**Description**

Modify the instance attribute. This method calls ec2 [ModifyInstanceAttribute](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#modifyInstanceAttribute-property)

**Parameters**
1. Access Key - This is a parameter taken from the vault to access AWS
2. Secret Key - This is a parameter taken from the vault to access AWS
3. Region 
4. Instance IDs - Instance IDs of all instances you want to modify. Accepts either a string with one or multiple instance IDs, each seperated with a new line,
    or an Array of instance IDs strings passed from code.
5. attribute - (option) choose the attribute to modify
6. attributeValue (string) specify the new value of an attribute
7. Dry Run (Boolean) - Checks whether you have the required permissions for the action, without actually making the request, and provides an error response. If you have the required permissions, the error response is DryRunOperation. Otherwise, it is UnauthorizedOperation.

      "viewName": "Start Instances",
          "viewName": "Region",
          "viewName": "Instance ids (array)",
      "viewName": "Stop Instances",
          "viewName": "Region",
          "viewName": "Instance ids (array)",
          "viewName": "Wait for Stopped State",
      "viewName": "Reboot Instances",
          "viewName": "Region",
          "viewName": "Instance ids (array)",
      "viewName": "Terminate Instances",
          "viewName": "Region",
          "viewName": "Instance Ids",
      "viewName": "Describe Instances",
          "viewName": "Region",
          "viewName": "Instance Ids",
          "viewName": "Filters (Array)",
          "viewName": "Dry Run",
          "viewName": "Get All Results",
      "viewName": "Modify Instance Type",
          "viewName": "Region",
          "viewName": "Instance IDs",
          "viewName": "Instance Type",
      "viewName": "Modify Instance Attribute",
          "viewName": "Region",
          "viewName": "Instance IDs",
          "viewName": "Attribute",
          "viewName": "Attribute value",
          "viewName": "Dry Run",
      "viewName": "Create Key Pair",
          "viewName": "Region",
          "viewName": "Key pair name",
      "viewName": "Delete Key Pair",
          "viewName": "Region",
          "viewName": "Key pair name",
      "viewName": "Describe Key Pairs",
          "viewName": "Region",
      "viewName": "Allocate An Address",
          "viewName": "Region",
          "viewName": "Address",
          "viewName": "Public IPv4 Pool",
          "viewName": "Dry Run",
      "viewName": "Associate An Address",
          "viewName": "Region",
          "viewName": "Allocation Id",
          "viewName": "Instance Id",
          "viewName": "Network Interface Id",
          "viewName": "Private Ip Address",
          "viewName": "Dry Run",
      "viewName": "Release An Address",
          "viewName": "Region",
          "viewName": "Allocation Id",
          "viewName": "Public Ip",
          "viewName": "Dry Run",
      "viewName": "Create VPC",
          "viewName": "Region",
          "viewName": "CIDR Block",
          "viewName": "Amazon Provided IPV6 Block",
          "viewName": "Instance Tenancy",
          "viewName": "Create Internet Gateway",
          "viewName": "Tags",
          "viewName": "Dry Run",
      "viewName": "Delete VPC",
          "viewName": "Region",
          "viewName": "VPC ID",
          "viewName": "Dry Run",
      "viewName": "Create Subnet",
          "viewName": "Region",
          "viewName": "VPC ID",
          "viewName": "Route Table ID",
          "viewName": "Availability Zone",
          "viewName": "CIDR Block",
          "viewName": "IPv6 CIDR Block",
          "viewName": "Outpost ARN",
          "viewName": "NAT Gateway Allocation ID",
          "viewName": "Create Private Route Table",
          "viewName": "Map Public IP On Launch",
          "viewName": "Tags",
          "viewName": "Dry Run",
      "viewName": "Delete Subnet",
          "viewName": "Region",
          "viewName": "Subnet ID",
          "viewName": "Dry Run",
      "viewName": "Create NAT Gateway",
          "viewName": "Region",
          "viewName": "Subnet ID",
          "viewName": "Allocation ID",
          "viewName": "Tags",
          "viewName": "Dry Run",
      "viewName": "Create Internet Gateway",
          "viewName": "Region",
          "viewName": "VPC ID",
          "viewName": "Tags",
          "viewName": "Dry Run",
      "viewName": "Attach Internet Gateway",
          "viewName": "Region",
          "viewName": "Gateway ID",
          "viewName": "VPC ID",
          "viewName": "Dry Run",
      "viewName": "Create Route",
          "viewName": "Region",
          "viewName": "Route Table ID",
          "viewName": "Gateway ID",
          "viewName": "NAT Gateway ID",
          "viewName": "Instance ID",
          "viewName": "Destination CIDR Block",
          "viewName": "Dry Run",
      "viewName": "Create Route Table",
          "viewName": "Region",
          "viewName": "VPC ID",
          "viewName": "Subnet ID",
          "viewName": "Gateway ID",
          "viewName": "tags",
          "viewName": "Dry Run",
      "viewName": "Associate Route Table",
          "viewName": "Region",
          "viewName": "Route Table ID",
          "viewName": "Subnet ID",
          "viewName": "Gateway ID",
          "viewName": "Dry Run",
      "viewName": "Create Volume",
          "viewName": "Region",
          "viewName": "Availability Zone",
          "viewName": "Volume Type",
          "viewName": "Size(In GBs)",
          "viewName": "IOPS",
          "viewName": "Create From Snapshot(ID)",
          "viewName": "Outpost ARN",
          "viewName": "Throughput",
          "viewName": "Is Encrypted",
          "viewName": "KMS Key ID",
          "viewName": "Multi Attach Enabled",
          "viewName": "Dry Run",
          "viewName": "Wait Until Operation End",
      "viewName": "Create EBS Snapshot",
          "viewName": "Region",
          "viewName": "Volume ID",
          "viewName": "Description",
          "viewName": "Outpost ARN",
          "viewName": "Dry Run",
          "viewName": "Wait Until Operation End",
      "viewName": "Create Security Group",
          "viewName": "Region",
          "viewName": "Name",
          "viewName": "Group description",
          "viewName": "VPC ID",
          "viewName": "Tags",
          "viewName": "Disallow Any Outbound Traffic",
          "viewName": "Dry Run",
      "viewName": "Add Security Group Rules",
          "viewName": "Region",
          "viewName": "Group ID",
          "viewName": "Rule Type",
          "viewName": "CIDR IPv4 Blocks",
          "viewName": "CIDR IPv6 Blocks",
          "viewName": "Port Ranges",
          "viewName": "Ip Protocol",
          "viewName": "ICMP Type",
          "viewName": "Description",
          "viewName": "Dry Run",
      "viewName": "Create Tags",
          "viewName": "Region",
          "viewName": "Resource ID",
          "viewName": "Tags",