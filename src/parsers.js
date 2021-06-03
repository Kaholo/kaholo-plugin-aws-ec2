function parseArray(value){
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof(value) === "string") return value.split("/n").map(line=>line.trim()).filter(line=>line);
    throw "Unsupprted array format";
}

function parseTags(value){
    if (!value) return [];
    if (Array.isArray(value)){
        if (!value.every(tag => tag.Key)){
            throw "Bad AWS Tags Format";
        }
        return value;
    }
    value = parseArray(value);
    return value.map(line => {
        let [key, ...val] = line.split("=");
        if (!val){
            return { Key: key };
        }
        if (Array.isArray(val)){
            val = val.join("=");
        }
        return { Key: key, Value: val };
    });
}

module.exports = {
    boolean : (value) =>{
        if (value === undefined || value === null || value === '') return undefined;
        return !!(value && value !=="false")
    },
    text : (value) =>{
        if (value)
            return value.split('\n');
        return undefined;
    },
    environmentVariables : (value)=>{
        const parsedEnvironmentVariables = module.exports.text(value);
        return !parsedEnvironmentVariables ? undefined : parsedEnvironmentVariables.reduce((obj, rawVariable)=>{
            const [key, value] = rawVariable.split(':');
            obj[key.trim()] = value.trim();
            return obj;
        },{})
    },
    number: (value)=>{
        if (!value) return undefined;
        const parsed = parseInt(value);
        if (parsed === NaN) {
            throw `Value ${value} is not a valid number`
        }
        return parsed;
    },
    autocomplete: (value)=>{
        if (!value) return undefined;
        if (value.id) return value.id;
        return value;
    },
    string: (value)=>{
        if (!value) return undefined;
        if (typeof(value) === "string") return value.trim();
        throw `Value ${value} is not a valid string`;
    },
    array: parseArray,
    tags: parseTags
}