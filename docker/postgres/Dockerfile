FROM postgres:17

RUN apt-get update && apt-get install -y \
    postgresql-17-repack \
    && rm -rf /var/lib/apt/lists/*

CMD ["postgres"]