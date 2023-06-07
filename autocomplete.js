const { autocomplete } = require("@kaholo/aws-plugin-library");
const { createSubnetText } = require("./helpers");

async function getInstanceTypes(query, params, client, region) {
  const payload = {
    Filters: [{
      Name: "location",
      Values: [region],
    }],
  };

  const {
    InstanceTypeOfferings: instanceTypes,
  } = await client.describeInstanceTypeOfferings(payload).promise();
  const autocompleteItems = instanceTypes.map((type) => (
    autocomplete.toAutocompleteItemFromPrimitive(type.InstanceType)
  ));

  const lowerCaseQuery = query.toLowerCase();
  const filteredItems = autocompleteItems.filter(({ id, value }) => (
    id.toLowerCase().includes(lowerCaseQuery)
    || value.toLowerCase().includes(lowerCaseQuery)
  ));

  return filteredItems;
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
