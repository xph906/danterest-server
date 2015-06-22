#!/bin/bash

curl -X GET http://localhost:3333/api/v1/testing  -H "Content-Type: application/json" -H "X-Access-Token: $1"
