#!/bin/bash

if [ "$CLOUD" = "" ]
then 
	HOST="localhost"
else
	HOST="danterest.cloudapp.net"
fi
PORT=8080
name="$1"

echo "http://${HOST}:${PORT}/api/v1/registration"

curl -X POST http://${HOST}:${PORT}/api/v1/registration -d '{"username":"'${name}'", "role":"student", "password":"1234", "email":"'${name}'@gmail.com"}' --header "Content-Type:application/json"

