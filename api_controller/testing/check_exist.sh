#!/bin/bash

if [ "${CLOUD}" = "" ]; then 
	HOST="localhost"
else
	HOST="danterest.cloudapp.net"
fi
PORT=8080

echo "http://${HOST}:${PORT}/api/v1/user-exist-check"

#Login
curl -X POST http://${HOST}:${PORT}/api/v1/user-exist-check -d '{"email":"'$1'", "username":"'$2'"}' --header "Content-Type: application/json"

