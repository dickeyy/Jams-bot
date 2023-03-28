const { Client, GatewayIntentBits, EmbedBuilder, Constants, Interaction, ApplicationCommandOptionType } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const { REST } = require('@discordjs/rest');
const { Routes, InteractionResponseType } = require('discord-api-types/v9');
const dotenv = require('dotenv');
const fs = require('fs');
const osu = require('node-os-utils');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { Manager } = require("lavacord");
const lavaConfig = require('./config.json');
const { URLSearchParams } = require("url");
const axios = require('axios');

// Process errors
process.on('uncaughtException', function (error) {
    console.log(error.stack);
});

// Load environment variables
dotenv.config();

// Define Color Hexs
const mainHex = "#5063f7"

// Initialize Mongo DB 
const MongoUri = 'mongodb+srv://kyledickey:CL46qBaMu3def3fT@jamsbot.90bmz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
const mClient = new MongoClient(MongoUri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
mClient.connect();
const db = mClient.db('jams-bot');
console.log('Connected to MongoDB')

// Connect to lavalink
const nodes = [
    { id: "1", host: "localhost", port: 2333, password: "pooplmaopassword" }
];

const lavaManager = new Manager(nodes, {
    user: '935801319569104948', // Client id
    shards: 0, // Total number of shards your bot is operating on
    send: (packet) => {
        if (client.guilds.cache) {
            const guild = client.guilds.cache.get(packet.d.guild_id);
            if (guild) return guild.shard.send(packet);
        }
    }
});
lavaManager.connect().then(() => {
    console.log('Connected to Lavalink');
})

lavaManager.on("error", (error, node) => {
    console.log(`An error occurred on node ${node.id}`, error);
})

// Write Commands
const commands = [

    {
        name: 'join',
        description: 'Join the voice channel',
    },

    {
        name: 'play',
        description: 'Play a song',
        options: [
            {
                name: 'song',
                type: ApplicationCommandOptionType.String,
                description: 'The song to play',
                required: true
            }
        ]
    },

]

// Register slash commands
const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

(async () => {
    try {
      console.log('Started refreshing application (/) commands.');
  
      await rest.put(
        //   Routes.applicationGuildCommands(process.env.BETA_APP_ID, '801360477984522260', '961272863363567636', '731445738290020442'),
        //   { body: commands },
          Routes.applicationCommands(process.env.APP_ID),
        //   Routes.applicationCommands(process.env.BETA_APP_ID),
          {body: commands},
      );
  
      console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error(error);
    }
})();

// Handle Recieved Interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const { commandName, options, user, guild, channel, ChannelData } = interaction

    if (commandName === 'join') {
        joinCmd(user, guild, interaction)
    }

    if (commandName === 'play') {
        const song = options.getString('song')
        await playCmd(user, guild, interaction, song)
    }
})

// Functions
// Cmd Run
async function cmdRun(user,cmdName) {
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();

    var collection = db.collection('commands')
    const doc = await collection.find({ name: cmdName }).toArray();

    var logData = `${date} ${time} | ${user.tag} - ${cmdName}\n`
    await log(logData)

    if (doc.length == 0) {
        const cmdData = {
            name: cmdName,
            runCount: 1
        }
        await collection.insertOne(cmdData)
    } else {
        var runCount = doc[0].runCount
        runCount ++ 

        await collection.updateOne({ name: cmdName }, { $set: { runCount: runCount }})
    }

    console.log(`${date} ${time} | ${user.tag} - ${cmdName}`)
}

// Log functuon 
async function log(logData) {

    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();

    if (logData == null) {
        return
    }

    fs.appendFile('./logs/' + date + '.txt', logData, function (err) {
        if (err !== null) {
            fs.writeFile('./logs/' + date + '.txt', logData, function (err) {
                if (err) throw err;
            });
        }
    });

}

// Command functions
async function joinCmd(user, guild, interaction) {
    const cmdName = 'join'

    if (!interaction.member.voice.channel) {
        const embed = new EmbedBuilder()
        .setTitle('You are not in a voice channel')
        .setColor('RED')
        cmdRun(user,cmdName)
        interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
        return
    }

    // check if the bot is in a vc
    if (guild.members.me.voice.channelId !== null) {
        const embed = new EmbedBuilder()
        .setTitle('I am already jamming in another voice channel')
        .setColor('Red')
        cmdRun(user,cmdName)
        interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
        return
    }

    // If all good, join the vc
    const node = lavaManager.idealNodes[0];
    await lavaManager.join({
        guild: guild.id, // Guild id
        channel: interaction.member.voice.channel.id, // Channel id
        node: node.id // lavalink node id, based on array of nodes
    });

    const embed = new EmbedBuilder()
    .setTitle('Joined the voice channel')
    .setColor(mainHex)

    interaction.reply({
        embeds: [embed],
    })

    cmdRun(user,cmdName)
}

// Play
async function playCmd(user, guild, interaction, song) {
    const cmdName = 'play'

    // Check if the user is in a vc
    if (!interaction.member.voice.channel) {
        const embed = new EmbedBuilder()
        .setTitle('You are not in a voice channel')
        .setColor('Red')
        cmdRun(user,cmdName)
        interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
        return
    }

    // check if the bot is in a vc
    if (guild.members.me.voice.channelId && interaction.member.voice.channelId !== guild.members.me.voice.channelId) {
        const embed = new EmbedBuilder()
        .setTitle('I am already jamming in another voice channel')
        .setColor('Red')
        cmdRun(user,cmdName)
        interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
        return
    }

    const node = lavaManager.idealNodes[0];

    // Query the song
    const params = new URLSearchParams();
    const search = 'ytsearch:' + song;
    params.append("identifier", search);

    // fetch(`http://${node.host}:${node.port}/loadtracks?${params}`, { headers: { Authorization: node.password } })
    //     .then(res => res.json())
    //     .then(data => {
    //         const player = lavaManager.join({
    //             guild: guild.id, // Guild id
    //             channel: interaction.member.voice.channel.id, // Channel id
    //             node: node.id // lavalink node id, based on array of nodes
    //         }).then(() => {
    //             const track = data.tracks[0];

    //             console.log(player)
            
    //             player.play(track.track).then(() => {})
    //         })
    //     })
    //     .catch(err => {
    //         console.error(err);
    //         return null;
    //     });

    const data = await axios({
        method: 'get',
        url: `http://${node.host}:${node.port}/loadtracks?${params}`,
        responseType: 'json',
        headers: { Authorization: node.password }
    })
    const res = data['data']
    
    const player = await lavaManager.join({
        guild: guild.id, // Guild id
        voiceChannel: interaction.member.voice.channel.id, // Channel id
        node: node.id // lavalink node id, based on array of nodes
    }, {
        selfdeaf: true
    });

    const track = res.tracks[0];

    await player.play(track.track)

    const embed = new EmbedBuilder()
    .setTitle('Now playing')
    .setDescription(track.info.title)
    .setColor(mainHex)
    .setThumbnail(track.info.thumbnail)
    .setURL(track.info.uri)
    .setFooter({text: `Requested by ${user.tag}`})
    .setTimestamp()
    interaction.reply({
        embeds: [embed],
    })


}

// Run bot
client.login(process.env.TOKEN);