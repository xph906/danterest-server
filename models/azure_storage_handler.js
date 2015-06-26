var azure = require('azure-storage');
var fs = require('fs-extra');
var util = require('util');
var path = require('path');

var env_config = require('./azure_env');

/*TODO: think about retry filter
 * ExponentialRetryPolicyFilter */
var blobSvc = azure.createBlobService();
console.log(process.env['AZURE_STORAGE_ACCOUNT']);
console.log(process.env['AZURE_STORAGE_ACCESS_KEY']);

var createContainerIfNotExist = function(container_name, callback){
	blobSvc.createContainerIfNotExists(container_name, 
    function(error, result, response){
    if(error){
      console.log("failed to create container: "+error);
      return ;
    }
    console.log("succeeded to create container: ");
    //callback(error, result, response);
  });
};

createContainerIfNotExist("xpan");
//var __base = "/Users/xpan/Documents/projects/danterest-server/";
var __base = "/Users/a/Projects/danterest-server/";
var uploadsStorePath = path.join(__base,'tmp','uploads');
var file =  path.join(uploadsStorePath,"IMG_0283.JPG");
console.log("file: "+file);
blobSvc.createBlockBlobFromLocalFile('mycontainer', 'IMG_0284.JPG', file,
  function(error, result, response){
  if(error){
    console.log("failed");
    return ;
  }
  console.log("successfully loaded. ");
  console.log(util.inspect({'result':result, 'response':response}));
});

blobSvc.listBlobsSegmented('mycontainer', null,
  function(error, result, response){
    var index, rs_arr;
    if(error){
      console.log("failed listing mycontainer");
      return ;
    }
    console.log("successfully listing. ");
    rs_arr = result.entries;
    for (index in rs_arr) {
      console.log("entry: " + rs_arr[index].name + 
        " properties:"+util.inspect({property:rs_arr[index].properties}) );
    }
});

var writeFile = path.join(uploadsStorePath,"downloads.JPG");
blobSvc.getBlobToStream('mycontainer', 'IMG_0284.JPG',
  fs.createWriteStream(writeFile),
  function(error, result, response){
    if(error){
      console.log("failed to download myblob:"+error);
      return ;
    }
    console.log("succeeded to download ");
});

var startDate = new Date();
var expiryDate = new Date(startDate);
expiryDate.setMinutes(startDate.getMinutes() + 100);
startDate.setMinutes(startDate.getMinutes() - 100);

var sharedAccessPolicy = {
  AccessPolicy: {
    Permissions: azure.BlobUtilities.SharedAccessPermissions.READ,
    Start: startDate,
    Expiry: expiryDate
  },
};

var blobSAS = blobSvc.generateSharedAccessSignature('mycontainer', 'IMG_0283.JPG',
  sharedAccessPolicy);
var host = blobSvc.host;
console.log("blobsas:"+blobSAS);
console.log("host: "+util.inspect({host:host}) );



