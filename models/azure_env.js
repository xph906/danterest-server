var envVariable = {
	AZURE_STORAGE_ACCOUNT : "portalvhdsv5f05ncfzqk3l",
	AZURE_STORAGE_ACCESS_KEY : "Qu/y1V6B+XRi+vKNqxcLiLpl3gMe0k//0hXWIspjMAB75IpEAVERGMqThtIb43N+H9WSYJ2DMeOySF74fdbu7A==",
	AZURE_STORAGE_CONNECTION_STRING : null
};
var vairable;
for (variable in envVariable) {
	if (envVariable.hasOwnProperty(variable) && envVariable[variable]){
		process.env[variable] = envVariable[variable];
		console.log(variable+":"+process.env[variable]);
	}
}

module.exports = envVariable;
