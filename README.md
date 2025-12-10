* Install the dependencies

`yarn`

* Copy the `.env.example` file to `.env`

* Configure the Postgres and Redis variables on the `.env` file

* Deploy Postgres and Redis through Docker (using Docker Compose)

`docker compose up -d`

* Copy the `.ormconfig.js.example` to `.ormconfig.js`

* Run the database migrations

`yarn migrate`
