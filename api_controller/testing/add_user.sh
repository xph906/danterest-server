#!/bin/bash
if [ "$CLOUD" = "" ]
then 
	HOST="localhost"
else
	HOST="danterest.cloudapp.net"
fi
PORT=8080
name="$1"

#curl -X POST http://localhost:3333/api/v1/registration -d '{"username":"'${name}'", "role":"student", "password":"1234", "email":"'${name}'@gmail.com"}' --header "Content-Type:application/json"

curl -X POST http://${HOST}:${PORT}/api/v1/registration -d '{"username":"'${name}'", "role":"student", "password":"1234", "email":"'${name}'@gmail.com"}' --header "Content-Type:application/json"

#curl -X POST http://danterest.cloudapp.net:8080/api/v1/registration -d '{"username":"'${name}'", "role":"student", "password":"1234", "email":"'${name}'@gmail.com"}' --header "Content-Type:application/json"
