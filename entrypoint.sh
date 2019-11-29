#!/bin/sh -l
echo "$INPUT_KS_COMMAND -apiKey=$INPUT_KS_API_KEY"
katalon-execute.sh $1 -apiKey=$2
status="done"
echo ::set-output name=status::$status