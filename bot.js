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
const setauto = 'setauto';
const remauto = 'removeauto';
const listauto = 'autoroles';
const setprefix = 'setprefix';

bot.on('ready', function (evt) {
  guilds = bot.guilds.array();
  console.log(`\nConnected to:`);
  for (var i = 0; i < guilds.length; i++) {
    console.log(` >${guilds[i].name}`);
  }
  console.log(`\nLogged in as: ${bot.user.username}`);
});

bot.on("message", onMessage);

async function onMessage(message) {
	if (message.author.bot) return;
	
	var guildname = message.guild.name;
	var author = message.member;
	var prefs = cache.get(guildname);
	
	const cmd = message.content.toLowerCase().split(" ")[0];
	const text = message.content.substring(cmd.length + 1) //Little bit of input cleaning
	
	if (!prefs) {
		console.log("Loading prefs into cache.");
		prefs = await loadPrefs(guildname);
	}
	
	if (!cmd.startsWith("!")) {
		return;
	}
	
	console.log("Processing command \"" + cmd + "\" in " + guildname);
	
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
		
		if (cmd == prefs.prefix + "adminhelp") {
			adminhelp(message.channel, prefs.prefix);
		}
		
		if (cmd == prefs.prefix + setavail) {
			adminAddRole(message, prefs, text);
		}
		
		if (cmd == prefs.prefix + remavail) {
			adminRemoveRole(message, prefs, text);
		}
		
		if (cmd == prefs.prefix + setauto) {
			adminAddAuto(message, prefs, text);
		}
		
		if (cmd == prefs.prefix + remauto) {
			adminRemoveAuto(message, prefs, text);
		}
		
		if (cmd == prefs.prefix + listauto) {
			listAuto(prefs, message.channel);
		}
		
		if (cmd == prefs.prefix + setprefix) {
			prefs.prefix = text;
			savePrefs(guildname);
		}
	}
}

bot.on("guildMemberAdd", (member) => {
	
	var guildname = member.guild.name;
	
	var prefs = cache.get(guildname);
	
	if (!prefs) {
		loadPrefs(guildname);
		return;
	}
	
	for (var i = 0; i < prefs.autoroles.length; i++) {
		giveUserRole(member.guild, null, member, prefs, prefs.autoroles[i]);
	}
});

bot.on('guildCreate', guild => {
	//makePrefs(guild.name);
});

bot.login(process.env.token);

// COMMAND METHODS
function help(channel, prefix) {
  channel.send(prefix + list + ": lists all available roles.\n"
				+ prefix + role + " <role>: Sets the role of the user that sent this message to <role>. \n" 
				+ prefix + remrole + " <role>: Removes the <role> from the user that sent this message.\n"
				+ prefix + "adminhelp: help for admins!\n");
}

function adminhelp(channel, prefix) {
  channel.send(prefix + setavail + " <role>: marks <role> as available for anyone to set for themselves. \n" 
				+ prefix + remavail + " <role>: removes <role> from availability.\n"
				+ prefix + setauto + " <role>: sets <role> to be automatically given to newcomers.\n"
				+ prefix + remauto + " <role>: removes <role> from being automatically given to newcomers.\n"
				+ prefix + listauto + ": lists all roles set to be automatically given to newcomers.\n"
				+ prefix + setprefix + " <symbol>: sets the prefix for all messages (default '!') to a new symbol.\n");
}


async function giveUserRole(guild, channel, user, prefs, rolename) {
	if (await checkRole(guild, prefs, rolename)) {
		try {
			const role = await getRole(guild, rolename);
			await user.addRole(role, "Ask and you shall receive.");
		} catch (error) {
			channel.send("Issue giving role, " + error);
		}
	} else {
		channel.send("Issue retrieving role.");
	}
}

async function removeUserRole(guild, channel, user, prefs, rolename) {
	if (await checkRole(guild, prefs, rolename)) {
		try {
			const role = await getRole(guild, rolename);
			await user.removeRole(role, "Ask and you shall receive.");
		} catch (error) {
			channel.send("Issue removing role, " + error);
		}
	} else {
		channel.send("Issue retrieving role.");
	}
}

async function adminAddRole(message, prefs, rolename) {
	var role = await getRole(message.guild, rolename);
	
	if (role && prefs.roles.indexOf(rolename) == -1) {
		prefs.roles.push(rolename);
		savePrefs(message.guild.name, prefs);
	} else {
		message.channel.send("Role already marked as available.");
	}
}

async function adminRemoveRole(message, prefs, rolename) {
	
	if (await checkRole(message.guild, prefs, rolename)) {
		prefs.roles.splice(prefs.roles.indexOf(rolename), 1);
		savePrefs(message.guild.name, prefs);
	} else {
		message.channel.send("Role already not available.");
	}
}

async function adminAddAuto(message, prefs, rolename) {
	var role = getRole(message.guild, rolename);
	
	if (role && prefs.autoroles.indexOf(rolename) == -1) {
		prefs.autoroles.push(rolename);
		savePrefs(message.guild.name, prefs);
	} else {
		message.channel.send("Role already marked as available.");
	}
}

async function adminRemoveAuto(message, prefs, rolename) {
	var role = getRole(message.guild, rolename);
	
	if (role && prefs.autoroles.indexOf(rolename) != -1) {
		prefs.autoroles.splice(prefs.autoroles.indexOf(rolename), 1);
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
		channel.send(str);
	} else {
		channel.send("No available roles.");
	}
}

async function listAuto(prefs, channel) {
	str = `Automatic roles: `;
	for (var i = 0; i < prefs.autoroles.length-1; i++) {
		str += (`${prefs.autoroles[i]}, `);
	}
	if (prefs.autoroles.length > 0) {
		str += (`${prefs.autoroles[prefs.autoroles.length - 1]}`);
		channel.send(str);
	} else {
		channel.send("No automatic roles.");
	}
}

async function checkRole(guild, prefs, name) {
	var exists = await getRole(guild, name);
	if (exists) {
		return prefs.roles.indexOf(name) >= 0;
	}
	return false;
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
        if (err) {
			cache.set(guildname, makePrefs(guildname));
			json = cache.get(guildname);
		} else {
			json = JSON.parse(data.Body.toString());
			console.log('Download Completed');
		}
    });
	
	await sleep(1000);
	
	cache.set(guildname, json);
	return json;
}

function makePrefs(guildname) {
	var content = "{\"prefix\":\"!\", \"autoroles\":[], \"roles\":[]}";
	savePrefs(guildname, JSON.parse(content));
	return JSON.parse(content);
}

function savePrefs(guildname, prefs) {
	var data = JSON.stringify(prefs, null, 2);
	var base64data = new Buffer.from(data, 'binary');
	
	const key = getPath(guildname);
	var params = {
		Bucket: BUCKET,
		Key: key,
		Body: base64data
	}
	
	s3.upload(params, (err, data) => {
		if (err) console.error(`Upload Error ${err}`)
		console.log('Upload Completed');
	});
	
	cache.set(guildname, prefs);
}

// UTILITY
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}