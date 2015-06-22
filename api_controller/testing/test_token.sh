#!/bin/bash
if [ "$CLOUD" = "" ]
then 
	HOST="localhost"
else
	HOST="danterest.cloudapp.net"
fi
PORT=8080

curl -X GET http://${HOST}:${PORT}/api/v1/testing  -H "Content-Type: application/json" -H "X-Access-Token: $1"
