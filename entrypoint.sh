#!/bin/sh -l
katalon-execute.sh $1 -apiKey=$2

status="done"
echo ::set-output name=status::$status