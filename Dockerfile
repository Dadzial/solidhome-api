FROM ubuntu:latest
LABEL authors="damian"

ENTRYPOINT ["top", "-b"]