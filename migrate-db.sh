echo "Migrating PRODUCTION database..."
yarn cross-env NODE_ENV=production typeorm migration:run