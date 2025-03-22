module.exports = {
    apps: [
      {
        name: 'simplex-cli',
        script: 'simplex-chat --ha -p 5225 -d simplexdb',
        out_file: './logs/simplex-cli.log'
      }
    ]
  };
  