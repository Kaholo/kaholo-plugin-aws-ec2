const _ = require("lodash");
const { autocomplete } = require("kaholo-aws-plugin");

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
  const createSubnetText = (subnet) => {
    const textSegments = [subnet.SubnetId];
    const subnetName = subnet.Tags.find(({ Key }) => Key === "Name");
    if (subnetName) {
      textSegments.push(subnetName.Value);
    }
    textSegments.push(subnet.AvailabilityZone);
    return textSegments.join(" | ");
  };

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
