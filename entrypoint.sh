#!/bin/sh -l
echo "$KS_COMMAND -apiKey=$KS_API_KEY"
katalon-execute.sh $1 -apiKey=$2
status="done"
echo ::set-output name=status::$status