const Discord = require("discord.js");
const fs = require("fs");
const bot = new Discord.Client();
const prefix = '#';
const prefPath = './prefs/'

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

//bot.login("key");

function getPath(guildname) { return prefPath + guildname + '.json'; }

function loadPrefs(guildname) {
	var prefpath = getPath(guildname);
	if (! fs.existsSync(prefpath)) {
		makePrefs(prefpath);
	}
	return JSON.parse(fs.readFileSync(prefpath, 'utf8'));
}

function makePrefs(path) {
	var content = "{\"prefix\":\"!\", \"roles\":\"[]\"}";
	fs.writeFileSync(path, content);
}

function savePrefs(guildname, prefs) {
	fs.writeFileSync(getPath(guildname), JSON.stringify(prefs, null, 2));
}

var pref = loadPrefs("TAT");
pref.prefix = "$";
savePrefs("TAT", pref);