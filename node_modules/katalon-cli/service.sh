#!/bin/bash
SERVICE_NAME=katalon-agent
USER_NAME=katalon-agent
CURRENT_DIR="$(cd "$(dirname "$BASH_SOURCE")"; pwd -P)"

if [[ $2 ]]; then
	SERVICE_NAME=$2
fi

case `arch` in
  *64*) BIN="cli-linux-x64";;
  *) BIN="cli-linux-x86";;
esac

if [[ ${SUDO_USER} ]]; then
	USER_NAME=${SUDO_USER}
else
	USER_NAME=`whoami`
fi

if [[ $1 == "uninstall" || $1 == "remove" ]]; then
	echo Uninstalling Katalon Agent service...
	set -x +e
        systemctl stop ${SERVICE_NAME}
        systemctl disable ${SERVICE_NAME}
        rm /etc/systemd/system/${SERVICE_NAME}.service
        systemctl daemon-reload
        systemctl reset-failed
	set +x -e
elif [[ $1 == "install" ]]; then
        echo Installing Katalon Agent service...
        #useradd -r -m -U -d /opt/${USER_NAME} -s /bin/false ${USER_NAME} || echo "User '${USER_NAME}' already exists."
	chown ${USER_NAME}:${USER_NAME} -R ${CURRENT_DIR}
        cat >/etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=Katalon Agent
After=network.target
[Service]
Type=simple
User=${USER_NAME}
ExecStart=${CURRENT_DIR}/${BIN} --service start-agent
UMask=0007
RestartSec=10
Restart=on-failure
[Install]
WantedBy=multi-user.target
EOF
        systemctl daemon-reload
        systemctl start ${SERVICE_NAME}
        systemctl status ${SERVICE_NAME}
	systemctl enable ${SERVICE_NAME}
elif [[ $1 == "start" ]]; then
	systemctl start ${SERVICE_NAME}
	systemctl status ${SERVICE_NAME}
elif [[ $1 == "stop" ]]; then
	systemctl stop ${SERVICE_NAME}
	systemctl status ${SERVICE_NAME}
else
        echo "Command not found"
	echo "Usage: service.sh install/remove/start/stop [service_name]"
fi
