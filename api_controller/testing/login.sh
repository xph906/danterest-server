#!/bin/bash
if [ "$CLOUD" = "" ]
then 
	HOST="localhost"
else
	HOST="danterest.cloudapp.net"
fi
PORT=8080

#Login
curl -X POST http://${HOST}:${PORT}/api/v1/login -d '{"accountname":"'$1'", "password":"'$2'"}' --header "Content-Type: application/json"

