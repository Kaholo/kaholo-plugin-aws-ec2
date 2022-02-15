const _ = require("lodash");

function parseArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof (value) === "string") {
    return value.split("\n").map((line) => line.trim()).filter((line) => line);
  }
  throw new Error("Unsupported array format");
}

function parseTags(value) {
  let valueCopy = _.clone(value);
  if (!valueCopy) {
    return undefined;
  }
  if (Array.isArray(valueCopy)) {
    if (!valueCopy.every((tag) => tag.Key)) {
      throw new Error("Bad AWS Tags Format");
    }
    return valueCopy;
  }
  if (typeof (valueCopy) === "string") {
    valueCopy = valueCopy.split("\n").map((line) => line.trim()).filter((line) => line);
    return valueCopy.map((line) => {
      const [key, ...val] = line.split("=");
      let stringValue;
      if (Array.isArray(val)) {
        stringValue = val.join("=");
      } else {
        stringValue = val;
      }
      return { Key: key, Value: stringValue };
    });
  }
  if (typeof (valueCopy) === "object") {
    return Object.entries(valueCopy).map(([key, val]) => ({ Key: key, Value: val }));
  }
  throw new Error("Unsupported tags format!");
}

module.exports = {
  boolean: (value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    return !!(value && value !== "false");
  },
  text: (value) => {
    if (value) {
      return value.split("\n");
    }
    return undefined;
  },
  environmentVariables: (value) => {
    const valueCopy = _.clone(value);
    const parsedEnvironmentVariables = module.exports.text(valueCopy);
    if (!parsedEnvironmentVariables) {
      return undefined;
    }

    return parsedEnvironmentVariables.reduce((_obj, rawVariable) => {
      const [k, v] = rawVariable.split(":");
      const obj = { ..._obj };
      obj[k.trim()] = v.trim();
      return obj;
    }, {});
  },
  number: (value) => {
    if (!value) {
      return undefined;
    }
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      throw new Error(`Value ${value} is not a valid number`);
    }
    return parsed;
  },
  autocomplete: (value) => {
    if (!value) {
      return undefined;
    }
    if (value.id) {
      return value.id;
    }
    return value;
  },
  string: (value) => {
    if (!value) {
      return undefined;
    }
    if (typeof (value) === "string") {
      return value.trim();
    }
    throw new Error(`Value ${value} is not a valid string`);
  },
  array: parseArray,
  tags: parseTags,
};
