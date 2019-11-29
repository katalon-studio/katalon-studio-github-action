#!/bin/sh -l
#echo "$INPUT_KS_COMMAND -apiKey=$INPUT_KS_API_KEY"
#katalon-execute.sh $INPUT_KS_COMMAND -apiKey=$INPUT_KS_API_KEY

echo "hello $1 $2"

status="done"
echo ::set-output name=status::$status