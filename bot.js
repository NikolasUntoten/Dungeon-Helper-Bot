const Discord = require("discord.js");
const fs = require("fs");

const aws = require('aws-sdk');
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const BUCKET = process.env.AWS_BUCKET_NAME;
//aws.config.update(
	//{
		//ACCESS_KEY,
		//SECRET_KEY,
		//'us-east-1'
	//}
//);

let s3 = new aws.S3();

const bot = new Discord.Client();
const prefPath = ''

const cache = new Map();

const list = 'roles';
const role = 'give';
const remrole = 'remove';
const setavail = 'available';
const remavail = 'unavailable';

bot.on('ready', function (evt) {
  guilds = bot.guilds.array();
  console.log(`\nConnected to:`);
  for (var i = 0; i < guilds.length; i++) {
    console.log(` >${guilds[i].name}`);
  }
  console.log(`\nLogged in as: ${bot.user.username}`);
});

bot.on("message", (message) => {
	var guildname = message.guild.name;
	var author = message.member;
	var prefs = loadPrefs(guildname);
	
	if (!prefs) {
		message.channel.send("Loading, please wait and try again.");
		return;
	}
	
	const cmd = message.content.toLowerCase().split(" ")[0];
	const text = message.content.substring(cmd.length + 1) //Little bit of input cleaning
	
	if (cmd == prefs.prefix + "help") {
		help(message.channel, prefs.prefix);
	}
	
	if (cmd == prefs.prefix + list) {
		listRoles(prefs, message.channel);
	}
	
	if (cmd == prefs.prefix + role) {
		giveUserRole(message.guild, message.channel, author, prefs, text);
	}
	
	if (cmd == prefs.prefix + remrole) {
		removeUserRole(message.guild, message.channel, author, prefs, text);
	}
	
	// role manager stuffs
	if (author.hasPermission(Discord.Permissions.FLAGS.MANAGE_ROLES)) {
		
		if (cmd == prefs.prefix + setavail) {
			adminAddRole(message, prefs, text);
		}
		
		if (cmd == prefs.prefix + remavail) {
			adminRemoveRole(message, prefs, text);
		}
	}
});


bot.login(process.env.token);

// COMMAND METHODS
function help(channel, prefix) {
  channel.send(prefix + list + ": lists all available roles.\n"
				+ prefix + role + " <name>: Sets the role of the user that sent this message to <name>. \n" 
				+ prefix + remrole + " <name>: Removes the role <name> from the user that sent this message.\n"
				+ "Below here are admin commands.\n"
				+ prefix + setavail + " <name>: marks role <name> as available for anyone to set for themselves. \n" 
				+ prefix + remavail + " <name>: removes role <name> from availability.\n");
}

async function giveUserRole(guild, channel, user, prefs, rolename) {
	if (checkRole(guild, prefs, rolename)) {
		try {
			const role = await getRole(guild, rolename);
			user.addRole(role, "Ask and you shall receive.");
		} catch (error) {
			channel.send("Issue giving role, " + error);
		}
	} else {
		channel.send("Issue retrieving role.");
	}
}

async function removeUserRole(guild, channel, user, prefs, rolename) {
	if (checkRole(guild, prefs, rolename)) {
		try {
			const role = await getRole(guild, rolename);
			user.removeRole(role, "Ask and you shall receive.");
		} catch (error) {
			channel.send("Issue removing role, " + error);
		}
	} else {
		channel.send("Issue retrieving role.");
	}
}

async function adminAddRole(message, prefs, rolename) {
	var role = getRole(message.guild, rolename);
	
	if (role && prefs.roles.indexOf(rolename) == -1) {
		prefs.roles.push(rolename);
		savePrefs(message.guild.name, prefs);
	} else {
		message.channel.send("Role already marked as available.");
	}
}

async function adminRemoveRole(message, prefs, rolename) {
	
	if (checkRole(message.guild, prefs, rolename)) {
		prefs.roles.splice(prefs.roles.indexOf(rolename), 1);
		savePrefs(message.guild.name, prefs);
	} else {
		message.channel.send("Role already not available.");
	}
}

async function listRoles(prefs, channel) {
	str = `Available roles: `;
	for (var i = 0; i < prefs.roles.length-1; i++) {
		str += (`${prefs.roles[i]}, `);
	}
	if (prefs.roles.length > 0) {
		str += (`${prefs.roles[prefs.roles.length - 1]}`);
	}
	channel.send(str);
}

async function checkRole(guild, prefs, name) {
	var exists = await getRole(guild, name);
	var available = (prefs.roles.indexOf(exists) != -1);
	return exists && available;
}

async function getRole(guild, rolename) {
	return guild.roles.find("name", rolename);
}

// JSON UTILITY METHODS

function getPath(guildname) { return prefPath + guildname + '.json'; }

async function loadPrefs(guildname) {
	
	if (cache.get(guildname)) {
		return cache.get(guildname);
	}
	
	const key = getPath(guildname);
	var params = {
		Bucket: BUCKET,
		Key: key,
	}
	var json;
	
    await s3.getObject(params, (err, data) => {
        if (err) console.error(err)
        json = JSON.parse(data.Body().toString());
    });
	
	if (json) {
		cache.set(guildname, json);
		return json;
	} else {
		cache.set(guildname, makePrefs(guildname);
		return cache.get(guildname);
	}
}

function makePrefs(guildname) {
	var content = "{\"prefix\":\"!\", \"roles\":[]}";
	savePrefs(guildname, content);
	return JSON.parse(content);
}

function savePrefs(guildname, prefs) {
	var data = JSON.stringify(prefs, null, 2);
	var base64data = new Buffer(data, 'binary');
	
	const key = getPath(guildname);
	var params = {
		Bucket: BUCKET,
		Key: key,
		Body: base64data
	}
	
	s3.upload(params, (err, data) => {
		if (err) console.error(`Upload Error ${err}`)
		console.log('Upload Completed')
	});
	
	cache.set(guildname, prefs);
}

// UTILITY
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}