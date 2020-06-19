set OUT_PATH=bin
.\node_modules\.bin\pkg.cmd --targets node10-linux-x64,node10-linux-x86,node10-macos-x64,node10-win-x64,node10-win-x86 --out-path %OUT_PATH% cli.js && copy /y agentconfig_template %OUT_PATH%\agentconfig
