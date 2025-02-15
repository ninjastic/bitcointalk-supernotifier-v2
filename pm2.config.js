module.exports = {
  apps: [
    {
      name: 'scraper',
      script: 'yarn start:scraper',
      out_file: './logs/scraper.log'
    },
    {
      name: 'server',
      script: 'yarn start:server',
      out_file: './logs/server.log'
    },
    {
      name: 'checker',
      script: 'yarn start:checker',
      out_file: './logs/checker.log'
    },
    {
      name: 'telegram',
      script: 'yarn start:telegram',
      out_file: './logs/telegram.log'
    },
    {
      name: 'elastic-sync',
      script: 'yarn start:sync',
      out_file: './logs/sync.log'
    }
  ]
};
