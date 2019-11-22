FROM katalonstudio/katalon
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]