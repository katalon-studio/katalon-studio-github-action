reg Query "HKLM\Hardware\Description\System\CentralProcessor\0" | find /i "x86" > NUL && set OS_ARCH=x86 || set OS_ARCH=x64

set "CURRENT_DIR=%~dp0"

"%CURRENT_DIR%cli-win-%OS_ARCH%.exe" start-agent
