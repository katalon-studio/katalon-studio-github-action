# ./node_modules/.bin/pkg --targets node6-linux-x64,node6-linux-x86,node6-macos-x64,node6-win-x64,node6-win-x86 --out-path bin cli.js
OUT_PATH=bin
./node_modules/.bin/pkg --targets node10-linux-x64,node10-linux-x86,node10-macos-x64,node10-win-x64,node10-win-x86 --out-path $OUT_PATH cli.js && cp ./agentconfig_template $OUT_PATH/agentconfig
