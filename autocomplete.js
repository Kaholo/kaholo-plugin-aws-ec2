const _ = require("lodash");
const { autocomplete } = require("kaholo-aws-plugin");
const { createSubnetText } = require("./helpers");

async function getInstanceTypes(query, params, client, region) {
  const payload = {
    MaxResults: "100",
    Filters: [{
      Name: "location",
      Values: [region],
    }, {
      Name: "instance-type",
      Values: [`*${query}*`],
    }],
  };

  return _.sortBy((await client.describeInstanceTypeOfferings(payload).promise())
    .InstanceTypeOfferings.map((type) => ({
      id: type.InstanceType,
      value: type.InstanceType,
    })), ["id"]);
}

async function listSubnets(query, params, client) {
  const subnets = await client.describeSubnets().promise();

  return subnets.Subnets.filter(
    (subnet) => subnet.VpcId.includes(query)
      || subnet.AvailabilityZone.includes(query)
      || subnet.SubnetId.includes(query),
  ).map((subnet) => (
    autocomplete.toAutocompleteItemFromPrimitive(subnet.SubnetId, createSubnetText(subnet))
  ));
}

module.exports = {
  listSubnets,
  getInstanceTypes,
  listRegions: autocomplete.listRegions,
};
