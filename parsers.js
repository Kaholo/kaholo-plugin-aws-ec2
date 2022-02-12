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

function parseTags(_value) {
  let value = { ..._value };
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    if (!value.every((tag) => tag.Key)) {
      throw new Error("Bad AWS Tags Format");
    }
    return value;
  }
  if (typeof (value) === "string") {
    value = value.split("\n").map((line) => line.trim()).filter((line) => line);
    return value.map((line) => {
      const [key, ..._val] = line.split("=");
      let val = _val;
      if (Array.isArray(val)) {
        val = val.join("=");
      }
      return { Key: key, Value: val };
    });
  }
  if (typeof (value) === "object") {
    return Object.entries(value).map(([key, val]) => ({ Key: key, Value: val }));
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
  environmentVariables: (_value) => {
    const value = { ..._value };
    const parsedEnvironmentVariables = module.exports.text(value);
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
