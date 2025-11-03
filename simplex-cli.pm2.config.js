module.exports = {
    apps: [
      {
        name: 'simplex-cli',
        script: './simplex-cli --ha --create-bot-display-name="BitcoinTalk SuperNotifier" -y -p 5225 -d simplexdb',
        out_file: './logs/simplex-cli.log'
      }
    ]
  };
  