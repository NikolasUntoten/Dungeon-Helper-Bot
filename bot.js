const Discord = require("discord.js");
const bot = new Discord.Client();
const prefix = '#';

var override = false;

bot.on('ready', function (evt) {
  guilds = bot.guilds.array();
  console.log(`\nConnected to:`);
  for (var i = 0; i < guilds.length; i++) {
    console.log(` >${guilds[i].name}`);
  }
  console.log(`\nLogged in as: ${bot.user.username}`);
});

bot.on("message", (message) => {
  
});

bot.login("");