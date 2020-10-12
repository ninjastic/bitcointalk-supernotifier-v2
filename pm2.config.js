module.exports = {
  apps: [
    {
      name: 'scrapper',
      script: 'yarn start:scrapper',
      out_file: './logs/scrapper.log',
    },
    {
      name: 'server',
      script: 'yarn start:server',
      out_file: './logs/server.log',
    },
    {
      name: 'checker',
      script: 'yarn start:checker',
      out_file: './logs/checker.log',
    },
    {
      name: 'telegram',
      script: 'yarn start:telegram',
      out_file: './logs/telegram.log',
    },
  ],
};
