#!/bin/bash

name="$1"
curl -X POST http://localhost:3333/api/v1/registration -d '{"username":"'${name}'", "role":"student", "password":"1234", "email":"'${name}'@gmail.com"}' --header "Content-Type:application/json"
