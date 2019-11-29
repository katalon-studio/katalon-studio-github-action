#!/bin/sh -l
echo "$1 -apiKey=$2"
katalon-execute.sh $1 -apiKey=$2
status="done"
echo ::set-output name=status::$status