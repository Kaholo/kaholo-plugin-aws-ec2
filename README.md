# Kaholo AWS EC2 Plugin
This plugin extends Kaholo's capabilities to interact with Amazon Web Services Elastic Compute Cloud (AWS EC2). The plugin makes use of npm package [aws-sdk API](https://www.npmjs.com/package/aws-sdk) to provide methods to create, start, stop, reboot, and terminate instances, and work with related virtual assets such as VPCs, IP addresses, key pairs, gateways, route tables, volumes, snapshots, and security groups.

## Prerequisites
To use this plugin you must have an account (either root or IAM) with Amazon Web Services (AWS) with sufficient permissions to work with EC2, and a pair of Access Keys associated with that account.

## Plugin Settings
To Access Plugin Settings, click on Settings | Plugins, find the "AWS EC2" plugin, and then click on the plugin's name, which is blue hypertext. There is only one plugin-level setting for AWS EC2, the default AWS region. If you specify a region here, e.g. `ap-southeast-1`, then newly created AWS EC2 actions will inherit that region by default. This is provided only as a convenience, and each action's region can be modified after creation if the configured default is not appropriate.

## Common Parameter: Region
Region is required parameter in most methods of this plugin. It is the AWS geographical region (and datacenter) where a resource exists or will be created. This parameter has an autocomplete function so you may select the region using either the CLI-type ID string, for example `ap-southeast-1`, or the user-friendly location, e.g. "Asia Pacific (Singapore)". If using the code layer, use the CLI-type ID string.

## Common Parameter: Dry Run
Dry Run is a commonly used parameter. If enabled, this tests whether the provided credentials have permissions to carry out the requested changes, but does NOT actually make any changes.

## Common Parameter: Tags
AWS Tags are a common way to organize cloud infrastructure with metadata. The most commonly used tag is "Name", which appears in the AWS Web Console under column heading "Name". To name or otherwise tag an asset, tags are provided as one-per-line Key=Value pairs in parameter "Tags". For example, 

    Name=AsiaPac Prod Gateway
    Env=production
    Owner=c_clay

## Plugin Account
This plugin makes use of a Kaholo Account to manage authentication. This allows the authentication to be configured once and then conveniently selected from a drop-down on an action-by-action basis. The security-sensitive AWS Access Keys are stored encrypted in the Kaholo vault to protect them from exposure in the UI, Activity Log, Final Result, and server logs. They may be stored in the vault before or during Kaholo Account creation.

The same Kaholo Account can be used for several AWS-related Kaholo plugins. If you've already configured one, for example to use with AWS CLI Plugin, then no further account configuration is necessary.

### Account Name
Account Name is an arbitrary name to identify a specific Kaholo account. It is suggested to name it after the AWS IAM user name associated with the access keys, and/or the type(s) of AWS access granted to that user. The names of the ID and Secret components in the Vault are ideally named similarly.

### Access Key ID (Vault)
This is the Access Key ID as provided by AWS or the AWS administrator. While the ID is not technically a secret it is vaulted anyway for better security. An Access Key ID looks something like this:

    AKIA3LQJ67DUTPFST5GM

### Access Key Secret (Vault)
This is the Access Key Secret as provided by AWS or the AWS administrator. This is a genuine secret and must be vaulted in the Kaholo Vault. An Access Key Secret looks something like this:

    DByOuQgqqwUWa8Y4Wu3hE3HTWZB6+mQVt8Qs0Phv

## Method: Create Instances
This method creates one or more new AWS instances.

### Parameter: Name
This sets the "Name" tag of the new instance to make it more easily identifiable in the AWS web console.

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

### Parameter: User Data
User Data is up to 16Kb of base64-encoded data that is typically some kind of initial configuration or startup instructions for the new instance. For more information about user data see the [AWS Documentation on User Data](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-add-user-data.html).

### Parameter: Minimum Instances
If launching more than one or a variable number of instances this is the minimum quantity of instances to launch.

### Parameter: Maximum Instances
If launching more than one or a variable number of instances this is the maximum quantity of instances to launch.

## Method: Describe Instances
This method describes existing AWS EC2 Instances.

### Parameter: Instance IDs
One or more specific Instance IDs to describe, as text entered one per line, e.g.

    i-0256a126b3eefa9c2
    i-005cde82b1e6f579a

If using the code layer, provide the list as an array of strings instead.

### Parameter: Filters
A general filter for more complex queries. Whether using text or code layer provide this one as an array. For example to describe all instances matching on of two instance types:

    [{"Name": "instance-type","Values": ["t3.nano","t3.micro"]}]

This filter must be a single-line string. If using the code layer on an object representation, use `JSON.stringify(filterObject)` before passing it as parameter "Filter".

See the [AWS Documentation](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeInstances.html) for available properties and values to use in filters.

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

### Parameter: Get All Results
The AWS API is by default limited to 1000 results. To get more than the first 1000 results, enable this parameter.

## Method: Modify Instance Type
This method modifies Instance Type. An instance must be stopped to modify instance type.

## Method: Modify Instance Attribute
This method modifies an assortment of instance attributes as described regarding AWS CLI documentation for [modify-instance-attribute](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ec2/modify-instance-attribute.html). Two common uses of this method are to enable/disable Termination Protection (DisableApiTermination) and Source-Destination checking (SourceDestCheck) for instances that are routers/firewalls/VPN endpoints, etc.

### Parameter: Instance IDs
One or more specific Instance IDs to describe, as text entered one per line, e.g.

    i-0256a126b3eefa9c2
    i-005cde82b1e6f579a

If using the code layer, provide the list as an array of strings instead.

### Parameter: Attribute
Select in the drop-down from the list of attributes available for modification by this method.

### Parameter: Attribute Value
The new value of the attribute. Text "true" and "false" are automatically converted to Boolean `true` and `false` for attributes requiring Boolean values.

### Parameter: Instance IDs
One or more specific Instance IDs to describe, as text entered one per line, e.g.

    i-0256a126b3eefa9c2
    i-005cde82b1e6f579a

If using the code layer, provide the list as an array of strings instead.

### Parameter: Instance Type
Instance Type determines types and quantities of compute resources are available to the instance, including CPU, RAM, GPU, disk and network bandwidth. It also determines the cost of the instance. For example, `t4g.large` instances have 2 vCPU of Arm-based AWS Graviton2 processors and 8 GB RAM. Not all instance types are available in all regions. See the [AWS Website](https://aws.amazon.com/ec2/instance-types/) for more details about instance types.

## Method: Create EBS Snapshot
Create a new snapshot of the specified EBS volume.

### Parameter: Volume ID
The ID of volume of which to create a snapshot.

### Parameter: Description
A description for the snapshot.

### Parameter: Outpost ARN
By default a snapshot is created in the same region as the volume. If using Amazon Outpost, and the snapshot should be stored on an Outpost, specify here the ARN of the Outpost. The snapshot must be created on the same outpost as the volume. If omitted, the snapshot is created in the same AWS region as the volume or outpost.

### Parameter: Wait Until Operation End
If enabled, the action will wait until the snapshot is 100% available before continuing. This is useful if downstream actions make use of the snapshot.

## Method: Create VPC
This method creates a new AWS EC2 Virtual Private Cloud (VPC). A VPC is a private network including subnets, route tables, and gateways that enable instances to network with each other, other networks, and the internet in controlled ways.

### Parameter: CIDR Block
Every VPC has a private IP Address space, specified in [CIDR format](https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing). A commonly used address space for this is `10.N.0.0/16` where `N` is an arbitrary integer in the range 1-254. IPv4 addresses beginning with `10` are specifically reserved for private address space. The most important factor in the choice of address space is that any two VPCs with overlapping address space will be more difficult to network, so each VPC ideally has a unique integer for `N`.

### Parameter: Amazon-provided IPv6 CIDR block
Enable this parameter to make use of an Amazon-provided IPv6 CIDR block. The range and size of these blocks are automatically determined by Amazon.

### Parameter: Instance Tenancy
For most use cases default is the only choice here. If you make use of single-tenant, dedicated hardware and want to force instances in the VPC to use the dedicated hardware, choose dedicated instead.

### Parameter: Create Internet Gateway
A common VPC configuration makes use of an AWS Internet Gateway to access the internet, for example by automatically assigning instances public IP addresses, or routing through a VPN instance that makes use of an Internet Gateway. Enable this parameter to automatically create and attach an AWS Internet Gateway to your VPC.

## Method: Delete VPC
This method deletes a VPC. To be deleted a VPC must first be emptied of dependent infrastructure such as instances and Internet Gateways.

### Parameter: VPC ID
The ID of the VPC to be deleted, for example `vpc-0c9fd47345334f78c`.

## Method: Create Subnet
This method creates a new subnet within a VPC. The subnet's CIDR address space must fall within that of the containing VPC. Otherwise a `The CIDR is invalid` error will occur.

### Parameter: Availability Zone
AWS Availability Zones are a subdivision of Region for the purpose of high availability. Each availability zone is serviced by a physically separate datacenter, reducing the probability of two different availability zones could experience failure simultaneously. Availability zone IDs are the same as the region ID followed by a letter, e.g. `a`, `b`, or `c`. Subnets are associated with availability zone so the subnet ultimately determines the availability zone in which an asset is located. Spot pricing, availability of spot instances, and availability of certain instance types and features may also vary by availability zone. If none of this is a concern, this parameter may be left empty and AWS will arbitrarily select an availability zone for the subnet.

### Parameter: VPC ID
The ID of the VPC in which the subnet will be created, for example `vpc-0c9fd47345334f78c`.

### Parameter: Route Table ID
The ID of an existing route table, if the subnet is to be associated with that table. If not specified the subnet will inherit the "main" (default) route table that is automatically created for every subnet.

### Parameter: CIDR Block
A part or all of the VPCs IP address space to be assigned to the subnet, in CIDR notation. The subnet's CIDR address space must fall within that of the containing VPC. Otherwise a `The CIDR is invalid` error will occur.

### Parameter: IPv6 CIDR Block
The same as CIDR Block, but assigning all or a part of the VPC's IPv6 address space to the subnet. If not using IPv6 this parameter may be left empty.

### Parameter: Outpost ARN
AWS Outpost is AWS infrastructure and services in an on-premise or edge location, not in an AWS data center. If using AWS Outpost, specify the Outpost ARN here. Otherwise leave it empty.

### Parameter: NAT Gateway Allocation ID
If specified, create a NAT Gateway within the subnet created, and assign it the specified Elastic IP allocation. For example, `eipalloc-0362742f973f712e9`.

### Parameter: Create Private Route Table
If enabled (true), a private route table will be created for this subnet, and if a NAT Gateway Allocation ID is also provided, route external traffic to the NAT Gateway.

### Parameter: Map Public IP On Launch
If enabled (true), each instance on the subnet will be given a public IP address.

## Method: Delete Subnet
Deletes the specified subnet. All instances running in a subnet must be terminated before the subnet can be deleted.

### Subnet ID
The ID of the Subnet to be deleted, e.g. `subnet-064787eb12c6a40aa`.

## Method: Create Internet Gateway
Creates an Internet Gateway. An internet gateway enables resources in your public subnets (such as EC2 instances) to connect to the internet if the resource has a public IP address. The gateway provides a target in the VPC route tables for internet-routable traffic, and exposes public IP addresses to access from outside AWS, i.e. the internet. There can be only one Internet Gateway per VPC.

### Parameter: VPC ID
The ID of the VPC to which an Internet Gateway should be added, e.g., `vpc-049a466e4efa9a56f`.

## Method: Attach Internet Gateway
Attaches an Internet Gateway to a VPC. A newly created gateway must be attached to a specific VPC before it becomes a valid target for a route table within that VPC. The gateway and VPC must exist in the same region to be attached.

### Parameter: Gateway ID
The ID of the gateway to attach, e.g. `igw-0215500f9020a14d7`.

### Parameter: VPC ID
The ID of the VPC to which the gateway is to be attached, e.g. `vpc-049a466e4efa9a56f`.

## Method: Create NAT Gateway
Creates a NAT gateway. A NAT gateway is a Network Address Translation (NAT) service. You can use a NAT gateway so that instances in a private subnet can connect to services outside your VPC but external services cannot initiate a connection with those instances.

### Parameter: Subnet ID
The subnet where the NAT Gateway will be created. 

### Parameter: Allocation ID
The allocation ID of an Elastic IP address to associate with the NAT gateway, e.g. `eipalloc-0362742f973f712e9`

## Method: Create Route Table

### Parameter: VPC ID
The ID of the VPC to which the gateway is to be attached, e.g. `vpc-049a466e4efa9a56f`.

### Parameter: Subnet ID
The subnet in which the Route Table will be created.

### Parameter: Gateway ID
If an internet gateway is specified here, it will be included in the created route table as the route for `0.0.0.0/0` - everything not otherwise routed elsewhere.

## Method: Create Route
Create a new route in an existing route table. The new route must target one of an internet gateway, a NAT gateway, or a specific instance (for example VM running VPN software).

### Parameter: Route Table ID
The ID of the route table to which the route will be added, e.g. `rtb-0443f0bc5fc8938ca`.

### Parameter: Gateway ID
Optional - specify to make the new route target an internet gateway.

### Parameter: NAT Gateway ID
Optional - specify to make the new route target a NAT gateway.

### Parameter: Instance ID
Optional - specify to make the new route target a VM instance.

### Parameter: Destination CIDR Block
The CIDR block notation for the address space of the new route, e.g. `0.0.0.0/0` or `10.22.33.0/24`.

## Method: Associate Route Table
Associates the specified route table with either a subnet or an internet gateway or both. If associated with a subnet, assets in the subnet will use the associated route table instead of the "main" (default) one.

### Parameter: Route Table ID
The ID of the route table to be associated, e.g. `rtb-0443f0bc5fc8938ca`.

### Parameter: Subnet ID
If specified, the ID of the subnet to be associated to the route table.

### Parameter: Gateway ID
If specified, the Gateway ID to be associated to the route table.

## Method: Allocate Address
This method allocates an IP address. If no parameters are provided, the allocted address comes from Amazon's pool of IPv4 addresses. If public or private address pools are associated with the AWS account, parameters are used to select specific IP addresses from those pools.

### Parameter: BYOIP Address (optional)
If you have a Bring your own IP (BYOIP) address pool, this parameter is a specific available address from that pool. To select an arbitrary available address from that pool instead, use "BYOIP Address Pool" instead. Leave both parameters empty to allocate an arbitrary address from Amazon's pool of addresses.

### Parameter: BYOIP Address Pool (optional)
If you have a Bring your own IP (BYOIP) address pool, to select an arbitrary available address from that pool, specify the pool's ID here. Leave the parameter empty to allocate a specific BYOIP address or an arbitrary address from Amazon's pool of addresses.

## Method: Associate Address
This method associates an Elastic IP address with an instance or a network interface. To create an Elastic IP address, use method "Allocate Address".

### Parameter: Allocation ID
The allocation ID of the IP address to be associated with an instance or network interface. Allocation ID is property `AllocationId` found in the Final Result of method "Allocate Address". For example, `eipalloc-06b93fa7325c0c27d`.

### Parameter: Instance ID
The instance ID of an AWS EC2 instance to which the Elastic IP address will be associated. This is the most commonly used option. If the instance has more than one network interface or private IP address and the Elastic IP address is to be associated with a specific interface or private IP, use parameters "Network Interface ID" or "Private IP Address" instead. Instance ID is given as `Instances[0].InstanceId` in the Final Result of method "Create Instance", where `0` is the first element of an array of instances created. For example, `i-002107513641fde32`.

### Parameter: Network Interface ID
The Network Interface ID of an AWS EC2 instance to which the address will be associated. This parameter is used if the instance has more than one network interface and the Elastic IP address must be associated with one specific network interface. Network Interface ID is given as `Instances[0].NetworkInterfaces[0].NetworkInterfaceId` in the Final Result of method "Create Instance", where `0` is the first element of an array of instances/network interfaces created. For example, `eni-08a62d0b9e98fc07c`. If there is only one network interface, it may be easier to use parameter "Instance ID" instead.

### Parameter: Private IP Address
The Private IP Address of an AWS EC2 instance to which the address will be associated. This parameter is used if the instance has more than one private IP address and the Elastic IP address must be associated with a specific one. Private IP address is given as `Reservations[0].Instances[0].NetworkInterfaces[0].PrivateIpAddresses[0].PrivateIpAddress` in the Final Result of method "Describe Instances", where `0` is the first member of an array of potentially multiple instances, interfaces, private ip addresses, etc. For example, `10.48.0.105`. If there is only one private IP address, it may be easier to use parameter "Instance ID" instead.

## Method: Release Address
This method releases the specified Elastic IP address. An address cannot be released while in use, e.g. while associated with an instance. In this example the instance might be terminated first, and then the address may be released. Releasing Elastic IP addresses is done as a housekeeping measure and to reduce costs, because AWS charges a premium for allocated Elastic IP addresses that are NOT in use.

### Parameter: Allocation ID
The allocation ID of the IP address to be released. Allocation ID is property `AllocationId` found in the Final Result of method "Allocate Address". For example, `eipalloc-06b93fa7325c0c27d`.

## Method: Create Security Group
Creates a new security group. A security group acts as a firewall that controls the traffic allowed to and from the resources in your virtual private cloud (VPC). You can choose the ports and protocols to allow for inbound traffic and for outbound traffic.

### Parameter: Name
The name of the security group to create. Name cannot be changed after the group is created.

### Parameter: Group description
A description for the security group

### Parameter: VPC ID
The VPC in which the security group is created, e.g. `vpc-049a466e4efa9a56f`.

### Parameter: Disallow Any Outbound Traffic
By default a new security group includes a rule that allows all outbound traffic, for example from inside the VPC to the internet. Enable this parameter to create a security group without that rule, i.e. an empty one.

## Method: Add Security Group Rules
Add rules to an existing security group. The rules of a security group control the inbound traffic that's allowed to reach the resources that are associated with the security group. The rules also control the outbound traffic that's allowed to leave them. Security group rules allow specific types of traffic. If there are no rules, then nothing no traffic is allowed.

### Parameter: Group ID
The ID of the security group to which a rule is to be added, e.g. `sg-0712e734dfab018e5`.

### Parameter: Rule Type
The type of rule to add, either ingress (from outside VPC) or egress (from within VPC).

### Parameter: CIDR IPv4 Blocks
The CIDR block notation for the source (if ingress) or destination (if egress) IPv4 addresses to allow.

### Parameter: CIDR IPv6 Blocks
The CIDR block notation for the source (if ingress) or destination (if egress) IPv6 addresses to allow.

### Parameter: Port Ranges
In the case of rules allowing TCP or UDP traffic, the port or range of ports to allow. Specify one port or range of ports per line. For example to allow SSH, HTTP, and ports 8080-8090...

    22
    80
    8080-8090

### Parameter: Ip Protocol
Which protocol to allow - specifically TCP, UDP, or ICMP, or select "All" to not restrict based on protocol.

### Parameter: ICMP Type
If ICMP was selected as IP Protocol to allow, optionally choose which type to allow. Echo Request for example would allow assets in the VPC to be reached by "ping".

### Parameter: Description
A description for the rule to add, e.g. "allow pings from outside".

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

## Method: Create Tags
This method tags most resources in AWS. AWS Tags are a common way to organize cloud infrastructure with metadata. The most commonly used tag is "Name", which appears in the AWS Web Console under column heading "Name".

### Parameter: Resource ID
The ID of the resource to be tagged.

### Parameter: Tags
Provide any number of tags as one-per-line Key=Value pairs.

## Method: Create Volume
Create a new EBS volume. This is not for the root volume created when a new VM instance is created, but add-on volumes that can be attached to existing VMs.

### Parameter: Availability Zone
Availability zone determines in which datacenter of the AWS region the volume is created and therefore also to which subnet's VMs the volume may be attached. Availability zone is the same as region, followed by a single-letter (a, b, c), for example `ap-southeast-1b` in region `ap-southeast-1`.

### Parameter: Volume Type
The type of volume to create. Several types are available:
* General Purpose SSD (gp2)
* General Purpose SSD (gp3)
* Provisioned IPOS SSD (io1)
* Provisioned IPOS SSD (io2)
* Cold HDD (sc1)
* Throughput Optimized HDD (st1)
* Magnetic (standard)

Magnetic is no longer the standard, but remains a slower and less expensive alternative to gp2. Read more about the differences between instance types in the [AWS User Guide](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-volume-types.html).

### Parameter: Size(In GiB)
An integer number for the size of the volume in GiB. Depending on type this may range from 1-16384 GiB (16 TiB).

### Parameter: IOPS
If volume type is io1 or io2, provide the integer quantity of IOPS to provision here. Read more about appropriately provisioning IOPS in the [AWS User Guide](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/provisioned-iops.html).

### Parameter: Create From Snapshot(ID)
Rather than creating a new empty volume, a snapshot ID can be provided to create the volume from an image, e.g. `snap-09414981882fe1209`.

### Parameter: Outpost ARN
If using Amazon Outpost and want the volume created in an outpost, provide the Outpost ARN here. Otherwise it will be created in the selected AWS region's datacenter.

### Parameter: Throughput
For volume type gp3 only - Gp3 volumes deliver a baseline performance of 3,000 IOPS and 125 MB/s at any volume size. A higher throughput may be specified in MiB/s, up to a maximum of 1,000. 

### Parameter: Is Encrypted
If enabled the volume is encrypted such that the volume and snapshots of it are unreadable without the appropriate encryption key.

### Parameter: KMS Key ID
The ID of the KMS Key to use if volume encryption is selected.

### Parameter: Multi Attach Enabled
For io1 and io2 volume types only, if enabled the same volume can be attached to and share by up to 16 VM instances in the same availability zone.

### Parameter: Wait Until Operation End
If enabled, the action waits until the volume is completely provisioned and ready for use before allowing the pipeline to continue. This is useful when downstream actions depend on the volume being ready.
