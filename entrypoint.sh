#!/bin/sh -l
katalon-execute.sh $1
status="done"
echo ::set-output name=status::$status