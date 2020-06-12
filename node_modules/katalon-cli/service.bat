@echo off
if not "%1"=="am_admin" (powershell start -verb runas '%0' 'am_admin %~dp0 %*' & exit /b) else (shift)

reg Query "HKLM\Hardware\Description\System\CentralProcessor\0" | find /i "x86" > NUL && set OS_ARCH=x86 || set OS_ARCH=x64

set "CURRENT_DIR=%1"
shift
echo %CURRENT_DIR%

set "SVC_EXE=%CURRENT_DIR%nssm.exe"

REM Default service name
set SERVICE_NAME="Katalon Agent"

REM PARSE PARAMETERS
if "x%1x" == "xx" goto displayUsage
set SERVICE_CMD=%1
shift

if "x%1x" == "xx" goto checkServiceCmd
set SERVICE_NAME=%1
if "x%1x" == "xx" goto checkServiceCmd

:checkServiceCmd
if /i %SERVICE_CMD% == install goto doInstall
if /i %SERVICE_CMD% == remove goto doRemove
if /i %SERVICE_CMD% == uninstall goto doRemove
if /i %SERVICE_CMD% == stop goto doStop
echo Unknown parameter "%SERVICE_CMD%"

:displayUsage
echo.
echo Usage: service.bat install/remove/stop [service_name]
goto :end

:doInstall
%SVC_EXE% install %SERVICE_NAME% "%CURRENT_DIR%cli-win-%OS_ARCH%.exe" "start-agent --service"
%SVC_EXE% "start" %SERVICE_NAME%
goto :end

:doRemove
%SVC_EXE% stop %SERVICE_NAME%
%SVC_EXE% remove %SERVICE_NAME% confirm
goto :end

:doStop
%SVC_EXE% stop %SERVICE_NAME%
goto :end

:end
pause