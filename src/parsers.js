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
    }
}