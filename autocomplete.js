const aws = require("aws-sdk");
const { autocomplete } = require("kaholo-aws-plugin");

async function getInstanceTypes(query, pluginSettings, actionParams) {
  const {
    client,
    params,
    settings,
  } = autocomplete.handleInput(aws.EC2, actionParams, pluginSettings);

  const payload = {
    MaxResults: "100",
    Filters: [{
      Name: "location",
      Values: [params.REGION || settings.REGION],
    }, {
      Name: "instance-type",
      Values: [`*${query}*`],
    }],
  };

  return (await client.describeInstanceTypeOfferings(payload).promise())
    .InstanceTypeOfferings.map((type) => ({
      id: type.InstanceType,
      value: type.InstanceType,
    })).sort((a, b) => {
      if (a.id < b.id) { return -1; }
      return 1;
    });
}

async function listSubnets(query, pluginSettings, actionParams) {
  const { client } = autocomplete.handleInput(aws.EC2, actionParams, pluginSettings);
  const subnets = await client.describeSubnets().promise();

  return subnets.Subnets.filter(
    (subnet) => subnet.VpcId.includes(query)
      || subnet.AvailabilityZone.includes(query)
      || subnet.SubnetId.includes(query),
  ).map((subnet) => autocomplete.itemFromValue(subnet.SubnetId));
}

module.exports = {
  listSubnets,
  getInstanceTypes,
  listRegions: autocomplete.listRegions,
};
