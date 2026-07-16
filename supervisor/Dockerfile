FROM  --platform=linux/amd64 ubuntu:latest

RUN apt-get update && apt-get install -y  supervisor
RUN mkdir -p /var/log/supervisor

COPY supervisord.conf /etc/supervisor/supervisord.conf

CMD ["/usr/bin/supervisord -c /etc/supervisor/supervisord.conf"]
