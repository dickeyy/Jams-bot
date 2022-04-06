const { Client, Intents, MessageEmbed, Constants, MessageActionRow, MessageButton, Interaction } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES] });
const { REST } = require('@discordjs/rest');
const { Routes, InteractionResponseType } = require('discord-api-types/v9');
const dotenv = require('dotenv');
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, getDoc, deleteDoc, Timestamp, addDoc, collection, updateDoc } = require("firebase/firestore");
const { Player, QueryType } = require('discord-player')
const fs = require('fs');
const osu = require('node-os-utils');

// Process errors
process.on('uncaughtException', function (error) {
    console.log(error.stack);
});

// Dotenv initialize 
dotenv.config();

// Define Color Hexs
const mainHex = "#5063f7"

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDNQrr0sE6JHczpQwTo-QL4e9_BkTnGn9k",
  authDomain: "jams-bot.firebaseapp.com",
  projectId: "jams-bot",
  storageBucket: "jams-bot.appspot.com",
  messagingSenderId: "975763003499",
  appId: "1:975763003499:web:2c52fbe0a59b0c1476f92e",
  measurementId: "G-91R8DS4RSH"
};

// Initialize Firebase Stuff
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Register voice client
client.player = new Player(client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
        opusEncoded: true,
    }
})
console.log('Player Loaded')

// Write commands and stuff
const commands = [
    { name: 'help', description: 'See all available commands' },
    { name: 'play', description: 'Play a song', options: [{ name: 'song', description: 'What song you want to play', required: true, type: Constants.ApplicationCommandOptionTypes.STRING }] },
    { name: 'queue', description: 'See the current queue', options: [{ name: 'page', description: 'See a specific page of the queue', required: false, type: Constants.ApplicationCommandOptionTypes.NUMBER }] },
    { name: 'stop', description: 'Make the bot leave the VC and clear the queue' },
    { name: 'shuffle', description: 'Shuffle the queue' },
    { name: 'nowplaying', description: 'Get info about the song that is currently playing' },
    { name: 'pause', description: 'Pause the current song' },
    { name: 'resume', description: 'Resume the current song' },
    { name: 'skip', description: 'Skip the current song' },
    { name: 'skipto', description: 'Skip to a specific song in the queue', options: [{ name: 'number', description: 'What number song in the queue do you want to skip to', required: true, type: Constants.ApplicationCommandOptionTypes.NUMBER }] },
    { name: 'clear', description: 'Clear the queue' },
    { name: 'stats', description: 'Get stats about the bot' }
]

// Register slash commands
const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

(async () => {
    try {
      console.log('Started refreshing application (/) commands.');
  
      await rest.put(
        //   Routes.applicationGuildCommands(process.env.APP_ID, '731445738290020442', '801360477984522260'),
        //   { body: commands },
          Routes.applicationCommands(process.env.APP_ID),
          {body: commands},
      );
  
      console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error(error);
    }
})();

// When the bot is ready
client.on('ready', () => {
    client.user.setActivity('/help', { type: 'LISTENING' });
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const { commandName, options, user, guild, channel, ChannelData, } = interaction

    if (commandName == 'help') {
        interaction.reply({
            embeds: [helpCmd(user,guild)]
        })
    }

    if (commandName == 'play') {
        const song = options.getString('song')
        await playCmd(user,guild,interaction,song)
    }

    if (commandName == 'queue') {
        const page = options.getNumber('page')
        await queueCmd(user,guild,interaction,page)
    }

    if (commandName == 'stop') {
        await stopCmd(user,guild,interaction)
    }

    if (commandName == 'shuffle') {
        await shuffleCmd(user,guild,interaction)
    }

    if (commandName == 'nowplaying') {
        await nowPlayingCmd(user,guild,interaction)
    }

    if (commandName == 'pause') {
        await pauseCmd(user,guild,interaction)
    }

    if (commandName == 'resume') {
        await resumeCmd(user,guild,interaction)
    }

    if (commandName == 'skip') {
        await skipCmd(user,guild,interaction)
    }

    if (commandName == 'skipto') {
        const number = options.getNumber('number')
        await skiptoCmd(user,guild,interaction,number)
    }

    if (commandName == 'clear') {
        await clearCmd(user,guild,interaction)
    }

    if (commandName == 'stats') {
        statsCmd(user,guild,interaction)
    }
});

// Define command functions
// Run Command function
function cmdRun(user,cmdName) {
    getDoc(doc(db, 'commands', cmdName)).then(docData => {
        var runCount = docData.data()['runCount']
        runCount ++
        updateDoc(doc(db, 'commands', cmdName), {runCount: runCount})
    })
    console.log(`${user.tag} -- ${cmdName}`)
}

// Help Command
function helpCmd(user,guild) {
    const cmdName = 'help'

    const embed = new MessageEmbed()
    .setTitle('Jams Help')
    .setDescription('All the command prefixes are `\`/`\`.\n\n`\`{item}`\` = optional parameter\n`\`[item]`\` = required parameter\n\n')
    .setFields([
        {name: 'Music Commands:', value: "`\`/play [song]`\`, `\`/queue {page}`\`, `\`/stop`\`, `\`/shuffle`\`, `\`/nowplaying`\`, `\`/pause`\`, `\`/resume`\`, `\`/skip`\`, `\`/skipto [queue number]`\`, `\`/clear`\`"},
        {name: "Misc. Commands:", value: "`\`/stats`\`"}
    ])
    .setColor(mainHex)

    cmdRun(user, cmdName)
    return embed
}

// Play Command
async function playCmd(user,guild,interaction,song) {
    const cmdName = 'play'
    
    if (!interaction.member.voice.channel) {
        const embed = new MessageEmbed()
        .setTitle('You are not in a voice channel')
        .setColor('RED')
        cmdRun(user,cmdName)
        interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
    } else {
        const queue = client.player.createQueue(interaction.guild)
        if (!queue.connection) {
            await queue.connect(interaction.member.voice.channel)
        }
        const result = await client.player.search(song, {
            requestedBy: user,
            searchEnginge: QueryType.AUTO,
        })
        if (result.tracks.length === 0) {
            const embed = new MessageEmbed()
            .setTitle('No results found')
            .setColor('RED')
            cmdRun(user,cmdName)
            interaction.reply({
                embeds: [embed],
                ephemeral: true
            })
        } else {
            const track = result.tracks[0]
            const embed = new MessageEmbed()
            if (queue.tracks.length == 0 && !queue.playing) {
                embed
                .setTitle('Now Playing')
            } else {
                embed
                .setTitle('Added to Queue')
            }

            await queue.addTrack(track)
            embed
            .setColor(mainHex)
            .setDescription(`[${track.title}](${track.url})`)
            .setThumbnail(track.thumbnail)
            .setFooter({text: `Duration: ${track.duration} | Views: ${track.views}`})
            cmdRun(user,cmdName)
            interaction.reply({
                embeds: [embed],
            })
        } if (!queue.playing) {
            queue.play()
        }
    }
}

// Queue Command
async function queueCmd(user,guild,interaction,page) {
    const cmdName = 'queue'

    const queue = client.player.getQueue(guild.id)

    if (!queue || !queue.playing) {
        const embed = new MessageEmbed()
        .setTitle('No songs in queue')
        .setColor('RED')
        cmdRun(user,cmdName)
        interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
    } else {
        const totalPages = Math.ceil(queue.tracks.length / 10) || 1
        const pageNum = page || 1 - 1

        if (pageNum > totalPages) {
            const embed = new MessageEmbed()
            .setTitle(`There are/is only ${totalPages} page(s)`)
            .setColor('RED')
            cmdRun(user,cmdName)
            interaction.reply({
                embeds: [embed],
                ephemeral: true
            })
        }

        const queueString = queue.tracks.slice(pageNum * 10, pageNum * 10 + 10).map((song, i) => {
            return `**${pageNum * 10 + i +1}.** \ [${song.title}](${song.url}) \ [${song.duration}] -- Requested By: <@${song.requestedBy.id}>`
        }).join('\n')
        const currentSong = queue.current

        interaction.reply({
            embeds: [
                new MessageEmbed()
                .setDescription(`**Currently Playing:**` + (currentSong ? `\`[${currentSong.duration}]\` ${currentSong.title} -- <@${currentSong.requestedBy.id}>` : `Nothing`) + `\n\n**Queue**\n${queueString}`)
                .setColor(mainHex)
                .setFooter({text: `Page ${pageNum + 1} / ${totalPages}`})
                .setThumbnail(currentSong.thumbnail)
            ],
        })
    }
    cmdRun(user,cmdName)
}

// Stop Command
async function stopCmd(user,guild,interaction) {
    const cmdName = 'stop'

    const queue = client.player.getQueue(guild.id)
    
    if (!queue) {
        const embed = new MessageEmbed()
        .setTitle('No songs in queue')
        .setColor('RED')
        cmdRun(user,cmdName)
        interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
    } else {
        queue.destroy()
        interaction.reply({
            embeds: [
                new MessageEmbed()
                .setTitle('Stopped the bot and cleared the queue!')
                .setColor(mainHex)
            ],
        })
        cmdRun(user,cmdName)
    }
}

// Shuffle Command
async function shuffleCmd(user,guild,interaction) {
    const cmdName = 'shuffle'

    const queue = client.player.getQueue(guild.id)

    if (!queue) {
        const embed = new MessageEmbed()
        .setTitle('No songs in queue')
        .setColor('RED')
        cmdRun(user,cmdName)
        interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
    } else {
        queue.shuffle()
        interaction.reply({
            embeds: [
                new MessageEmbed()
                .setTitle(`Shuffled the queue! (${queue.tracks.length} songs)`)
                .setColor(mainHex)
            ],
        })
        cmdRun(user,cmdName)
    }
}

// Currently Playing Command
async function nowPlayingCmd(user,guild,interaction) {
    const cmdName = 'nowplaying'

    const queue = client.player.getQueue(guild.id)

    if (!queue) {
        const embed = new MessageEmbed()
        .setTitle('No songs in queue')
        .setColor('RED')
        cmdRun(user,cmdName)
        interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
    } else {
        let bar = queue.createProgressBar({
            queue: false,
            length: 19,
        })
        const song = queue.current

        const embed = new MessageEmbed()
        .setTitle('Currently Playing')
        .setColor(mainHex)
        .setThumbnail(song.thumbnail)
        .setDescription(`[${song.title}](${song.url})\n\n` + bar)
        
        interaction.reply({
            embeds: [embed],
        })
        cmdRun(user,cmdName)
    }
}

// Pause command
async function pauseCmd(user,guild,interaction) {
    const cmdName = 'pause'

    const queue = client.player.getQueue(guild.id)
    
    if (!queue.playing) {
        const embed = new MessageEmbed()
        .setTitle('Im not playing anything')
        .setColor('RED')
        cmdRun(user,cmdName)
        interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
    } else {
        queue.setPaused(true)
        interaction.reply({
            embeds: [
                new MessageEmbed()
                .setTitle('Paused the jams!')
                .setColor(mainHex)
            ],
        })
        cmdRun(user,cmdName)
    }
}

// Resume command
async function resumeCmd(user,guild,interaction) {
    const cmdName = 'resume'

    const queue = client.player.getQueue(guild.id)

    if (!queue) {
        const embed = new MessageEmbed()
        .setTitle('No songs in queue')
        .setColor('RED')
        cmdRun(user,cmdName)
        interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
    } else if (!queue.setPaused) {
        const embed = new MessageEmbed()
        .setTitle('Im not paused')
        .setColor('RED')
        cmdRun(user,cmdName)
        interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
    } else {
        queue.setPaused(false)
        interaction.reply({
            embeds: [
                new MessageEmbed()
                .setTitle('Resumed the jams!')
                .setColor(mainHex)
            ],
        })
        cmdRun(user,cmdName)
    }
}

// Skip command
async function skipCmd(user,guild,interaction) {
    const cmdName = 'skip'

    const queue = client.player.getQueue(guild.id)

    if (!queue) {
        const embed = new MessageEmbed()
        .setTitle('No songs in queue')
        .setColor('RED')
        cmdRun(user,cmdName)
        interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
    } else {
        queue.skip()
        interaction.reply({
            embeds: [
                new MessageEmbed()
                .setTitle('Skipped the current song!')
                .setColor(mainHex)
            ],
        })
        cmdRun(user,cmdName)
    }
}

// skipto command
async function skiptoCmd(user,guild,interaction,queueNum) {
    const cmdName = 'skipto'

    const queue = client.player.getQueue(guild.id)

    if (!queue) {
        const embed = new MessageEmbed()
        .setTitle('No songs in queue')
        .setColor('RED')
        cmdRun(user,cmdName)
        interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
    } else {
        if (queueNum - 1 > queue.tracks.length) {
            const embed = new MessageEmbed()
            .setTitle('Invalid queue number')
            .setColor('RED')
            cmdRun(user,cmdName)
            interaction.reply({
                embeds: [embed],
                ephemeral: true
            })
        } else {
            queue.skipTo(queueNum - 1)
            interaction.reply({
                embeds: [
                    new MessageEmbed()
                    .setTitle(`Skipped to song ${queueNum} in the queue!`)
                    .setColor(mainHex)
                ],
            })
            cmdRun(user,cmdName)
        }
    }
}

// clear command 
async function clearCmd(user,guild,interaction) {
    const cmdName = 'clear'

    const queue = client.player.getQueue(guild.id)
    console.log(queue)

    if (!queue) {
        const embed = new MessageEmbed()
        .setTitle('No songs in queue')
        .setColor('RED')
        cmdRun(user,cmdName)
        interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
    } else {
        queue.clear()
        interaction.reply({
            embeds: [
                new MessageEmbed()
                .setTitle('Cleared the queue!')
                .setColor(mainHex)
            ],
        })
        cmdRun(user,cmdName)
    }
}

// Stats Commnad
function statsCmd(user,guild,interaction) {
    const cmdName = 'stats'

    const guilds = client.guilds.cache.size
    const users = client.users.cache.size
    const cpu = osu.cpu
    const mem = osu.mem

    cpu.usage().then(cpuPercentage => {
        mem.info().then(info => {
            const embed = new MessageEmbed()
                .setColor(mainHex)
                .setTitle('Jams Stats')
                .setThumbnail('https://jamsbot.com/images/logo.png')
                .addField("Servers:", `${guilds}`, true)
                .addField('Users:', `${users}`, true)
                .addField('CPU %', `${cpuPercentage}`, true)
                .addField('Mem. %', `${info.freeMemPercentage}%`, true)
                .addField('Ping', `${Math.round(client.ws.ping)}ms`, true)
                .addField('Library:', 'Discord.JS', true)
            interaction.reply({
                embeds: [embed],
            })
            cmdRun(user,cmdName)
        });
    });
}

// Run bot
client.login(process.env.TOKEN);