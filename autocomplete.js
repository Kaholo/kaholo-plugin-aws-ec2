const { autocomplete } = require("@kaholo/aws-plugin-library");
const { DescribeInstanceTypeOfferingsCommand, DescribeSubnetsCommand } = require("@aws-sdk/client-ec2");
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
  } = await client.send(new DescribeInstanceTypeOfferingsCommand(payload));

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
  const payload = {};
  if (params.vpcId) {
    payload.Filters = [
      {
        Name: "vpc-id",
        Values: [params.vpcId],
      },
    ];
  }

  const subnets = await client.send(new DescribeSubnetsCommand(payload));

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
