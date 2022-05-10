const { Client, Intents, MessageEmbed, Constants, MessageActionRow, MessageButton, Interaction } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES] });
const { REST } = require('@discordjs/rest');
const { Routes, InteractionResponseType } = require('discord-api-types/v9');
const dotenv = require('dotenv');
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, getDoc, deleteDoc, Timestamp, addDoc, collection, updateDoc, getDocs } = require("firebase/firestore");
const { Player, QueryType } = require('discord-player')
const fs = require('fs');
const osu = require('node-os-utils');
const { Lyrics, Reverbnation, Facebook, Vimeo } = require("@discord-player/extractor");
const lyricsClient = Lyrics.init();
const { MongoClient, ServerApiVersion } = require('mongodb');
const { VoiceClient } = require('djs-voice');
// const { Manager } = require("lavacord");
// const axios = require('axios').default

// Process errors
process.on('uncaughtException', function (error) {
    console.log(error.stack);
});

// Dotenv initialize 
dotenv.config();

// Define Color Hexs
const mainHex = "#5063f7"

// Firebase config
// const firebaseConfig = {
//   apiKey: "AIzaSyDNQrr0sE6JHczpQwTo-QL4e9_BkTnGn9k",
//   authDomain: "jams-bot.firebaseapp.com",
//   projectId: "jams-bot",
//   storageBucket: "jams-bot.appspot.com",
//   messagingSenderId: "975763003499",
//   appId: "1:975763003499:web:2c52fbe0a59b0c1476f92e",
//   measurementId: "G-91R8DS4RSH"
// };

// // Initialize Firebase Stuff
// const app = initializeApp(firebaseConfig);
// const db = getFirestore(app);
// console.log('Firebase Initialized')

// Initialize Mongo DB 
const MongoUri = process.env.MONGO_URI;
const mClient = new MongoClient(MongoUri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
mClient.connect();
const mdb = mClient.db('jams-bot');
console.log('Connected to MongoDB')

// Register voice client
client.player = new Player(client, {
    leaveOnEnd: false,
    leaveOnEmpty: false,
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
        opusEncoded: true,
    }, 
})
client.player.use("reverbnation", Reverbnation);
client.player.use("facebook", Facebook);
client.player.use("vimeo", Vimeo)
console.log('Player Loaded')

// Register Listener Client
const listenerClient = new VoiceClient({
    allowBots: false,
    client: client,
    debug: false,
    mongooseConnectionString: MongoUri
})
console.log('Listener Client Initialized')

// connect to lavalink server
// const nodes = [
//     { id: "1", host: "localhost", port: 2333, password: "pooppooppassword" }
// ];
// const lava = new Manager(nodes,{
//     user: '819019613371236432',
//     shards: 0,
//     send: (packet) => {
//         if (client.guilds.cache) {
//             const guild = client.guilds.cache.get(packet.d.guild_id);
//             if (guild) return guild.shard.send(packet);
//         }
//     }
// })
// lava.on('error', (err, node) => {
//     console.log(`Lavalink error on node ${node.id} -- Error: ${err}`)
// })

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
    { name: 'stats', description: 'Get stats about the bot' },
    { name: 'loop', description: 'Loop the current song' },
    { name: 'loopqueue', description: 'Loop the queue' },
    { name: 'stoploop', description: 'Stop looping the current song / queue' },
    { name: 'info', description: 'Get some information about the bot' },
    { name: 'lyrics', description: 'Get the lyrics for the current song' },
    { name: 'volume', description: 'Set the default volume of the bot', options: [{ name: 'level', description: 'The level of the volume you want to set, must be < 250', required: true, type: Constants.ApplicationCommandOptionTypes.NUMBER }] },
    { name: 'filter', description: 'Set a filter for the music', options: [{ name: 'filter', description: 'The filter you want to apply, to get a list of filters', required: true, type: Constants.ApplicationCommandOptionTypes.STRING, choices: [ { name: 'off', value: 'off'}, { name: '3D', value: '3D' }, { name: 'bassboost', value: 'bassboost_high' }, { name: '8D', value: '8D'}, { name: 'vaporwave', value: 'vaporwave' }, { name: 'nightcore', value: 'nightcore' }, { name: 'phaser', value: 'phaser' }, { name: 'tremolo', value: 'tremolo' }, { name: 'vibrato', value: 'vibrato' }, { name: 'reverse', value: 'reverse' }, { name: 'treble', value: 'treble' }, { name: 'normalizer', value: 'normalizer' }, { name: 'surrounding', value: 'surrounding' }, { name: 'pulsator', value: 'pulsator' }, { name: 'subboost', value: 'subboost' }, { name: 'karaoke', value: 'karaoke' }, { name: 'flanger', value: 'flanger' }, { name: 'compressor', value: 'compressor' }, { name: 'expander', value: 'expander' }, { name: 'softlimiter', value: 'softlimiter' }, { name: 'chorus', value: 'chorus' }, { name: 'fadein', value: 'fadein' }, { name: 'earrape', value: 'earrape' }] }] },
    { name: 'leaderboard', description: 'See a voice activity leaderboard for your server' },

    // {name: 'lavaplay', description: 'lava join', options: [{ name: 'song', description: 'song balls', required: true, type: Constants.ApplicationCommandOptionTypes.STRING }]}
]

// Register slash commands
const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);
// const rest = new REST({ version: '9' }).setToken(process.env.BETA_TOKEN);

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

// When the bot is ready
client.on('ready', () => {
    client.user.setActivity('/help', { type: 'LISTENING' });
    
    // lava.connect().then(success => {
    //     console.log('Lavalink Server Connected')
    // });

    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const { commandName, options, user, guild, channel, ChannelData } = interaction

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

    if (commandName == 'loop') {
        await loopCmd(user,guild,interaction)
    }

    if (commandName == 'loopqueue') {
        await loopqueueCmd(user,guild,interaction)
    }

    if (commandName == 'stoploop') {
        await stoploopCmd(user,guild,interaction)
    }

    if (commandName == 'info') {
        infoCmd(user,guild,interaction)
    }

    if (commandName == 'lyrics') {
        await lyricsCmd(user,guild,interaction)
    } 

    if (commandName == 'volume') {
        const level = options.getNumber('level')
        await volumeCmd(user,guild,interaction,level)
    }

    if (commandName == 'filter') {
        const filter = options.getString('filter')
        await filterCmd(user,guild,interaction,filter)
    }

    if (commandName == 'leaderboard') {
        await leaderboardCmd(user,guild,interaction)
    }

    // if (commandName == 'lavaplay') {
    //     const search = options.getString('song')
    //     await lavalinkJoin(user, guild, interaction, search)
    // }
});

// Client events
// when bot joins a new server
client.on('guildCreate', async guild => {
    const isPartnered = guild.partnered
    const guildData = {
        _id: guild.id,
        id: guild.id,
        name: guild.name,
        description: guild.description,
        memberCount: guild.memberCount,
        large: guild.large,
        vanityUrl: guild.vanityURLCode,
        joinedAt: Timestamp.now(),
        ownerId: guild.ownerId,
        shardId: guild.shardId,
        bannerUrl: guild.banner,
        features: guild.features,
        icon: guild.icon,
        maxMembers: guild.maximumMembers,
        partnered: isPartnered,
    }

    const collection = mdb.collection('guilds');
    await collection.insertOne(guildData);

    console.log(`New Guild -- ${guild.name}`)
});

// When the bot leaves a server
client.on('guildDelete', async guild => {
    const collection = mdb.collection('guilds');
    await collection.deleteOne({ _id: guild.id })
    console.log(`Left Guild -- ${guild.name}`)
})

// Update Guild Data in DB events
// When user joins guild
client.on('guildMemberAdd', async member => {
    console.log('ahhhhh')
    console.log(member)
})

// Stuff for listen time tracking
client.on('voiceStateUpdate', (oldState, newState) => {
    listenerClient.startListener(oldState, newState)
})

// Define command functions
// Run Command function
async function cmdRun(user,cmdName) {
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    
    var collection = mdb.collection('commands')
    const doc = await collection.find({ name: cmdName }).toArray();

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
    console.log(`${date} ${time} | ${user.tag} -- ${cmdName}`)
}

// Help Command
function helpCmd(user,guild) {
    const cmdName = 'help'

    const embed = new MessageEmbed()
    .setTitle('Jams Help')
    .setDescription('All the command prefixes are `\`/`\`.\n\n`\`{item}`\` = optional parameter\n`\`[item]`\` = required parameter\n\n')
    .setFields([
        {name: 'Music Commands:', value: "`\`/play [song]`\`, `\`/queue {page}`\`, `\`/stop`\`, `\`/shuffle`\`, `\`/nowplaying`\`, `\`/pause`\`, `\`/resume`\`, `\`/skip`\`, `\`/skipto [queue number]`\`, `\`/clear`\`, `\`/loop`\`, `\`/loopqueue`\`, `\`/stoploop`\`, `\`/lyrics`\`, `\`/volume [number]`\`, `\`/filter [filter name]`\`"},
        {name: "Misc. Commands:", value: "`\`/stats`\`, `\`/info`\`, `\`/leaderboard`\`"},
        { name: 'Links', value: '[🌐 Website](https://jamsbot.com) | [<:invite:823987169978613851> Invite](https://jamsbot.com/invite) | [<:discord:823989269626355793> Support](https://jamsbot.com/support)', inline: false }

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
            
            if (track.playlist != undefined) {
                const playlist = result.playlist
                await queue.addTracks(result.tracks)
                embed
                .setDescription(`[${playlist.title}](${playlist.url})`)
                .setThumbnail(playlist.thumbnail)
                .setFooter({text: `Songs: ${result.tracks.length} | Views: ${playlist.views}`})

            } else {
                await queue.addTrack(track)
                embed
                .setDescription(`[${track.title}](${track.url})`)
                .setThumbnail(track.thumbnail)
                .setFooter({text: `Duration: ${track.duration} | Views: ${track.views}`})
            }
            embed
            .setColor(mainHex)
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

        if (page == null) {
            const pageNum = 0

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
        } else {
            const pageNum = page - 1

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
            timecodes: true,
        })
        const song = queue.current

        const embed = new MessageEmbed()
        .setTitle('Currently Playing 🔊')
        .setColor(mainHex)
        .setThumbnail(song.thumbnail)
        .setDescription(`[${song.title}](${song.url})\n\n` + bar)
        .setFields([
            { name: "Requested By:", value: `${song.requestedBy}`, inline: true },
            { name: "Artist:", value: `${song.author}`, inline: true },
        ])
        
        // const row = new MessageActionRow()
        // .addComponents(
        //     new MessageButton()
        //     .setCustomId('pAndR')
        //     .setLabel('Pause / Resume')
        //     .setStyle('SUCCESS'),

        //     new MessageButton()
        //     .setCustomId('skip')
        //     .setLabel('Skip')
        //     .setStyle('PRIMARY'),

        //     new MessageButton()
        //     .setCustomId('lyrics')
        //     .setLabel('Lyrics')
        //     .setStyle('SECONDARY'),

        //     new MessageButton()
        //     .setCustomId('stop')
        //     .setLabel('Stop')
        //     .setStyle('DANGER'),

        // )
        // var paused = false
        // client.on('interactionCreate', interaction => {
        //     if (!interaction.isButton()) return;

        //     if (interaction['customId'] == 'pAndR') {
                
        //         if (!paused) {
        //             queue.setPaused(true)
        //             paused = true
        //             interaction.reply({
        //                 content: '👍',
        //                 ephemeral: true
        //             })
        //         } else if (paused) {
        //             queue.setPaused(false)
        //             paused = false
        //             interaction.reply({
        //                 content: '👍',
        //                 ephemeral: true
        //             })
        //         }

        //     } else if (interaction['customId'] == 'skip') {
        //         queue.skip()
        //         interaction.reply({
        //             content: '👍',
        //             ephemeral: true
        //         })
        //     } else if (interaction['customId'] == 'stop') {
        //         queue.destroy()
        //         interaction.reply({
        //             content: '👍',
        //             ephemeral: true
        //         })
        //     } else if (interaction['customId'] == 'lyrics') {
        //         const song = queue.current
        //         const songTitle = song.title
        //         lyricsClient.search(songTitle)
        //             .then(x => {
        //                 const embed = new MessageEmbed()
        
        //                 if (x != null) {
        //                     embed.setTitle(`Lyrics for ${songTitle}`)
        //                     embed.setColor(mainHex)
        //                     embed.setDescription(x.lyrics)
        //                     embed.setThumbnail(x.thumbnail)
        //                     embed.setAuthor({name: `${x.artist.name}`, iconURL: x.artist.image})
        //                     interaction.reply({
        //                         embeds: [embed],
        //                     })
        //                 } else {
        //                     embed.setTitle('Can not get lyrics')
        //                     embed.setColor('RED')
        //                     interaction.reply({
        //                         embeds: [embed],
        //                         ephemeral: true
        //                     })
        //                 }
        //             }
        //         )
        //     }
        // });

        interaction.reply({
            embeds: [embed],
            // components: [row],
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
        // const row  = new MessageActionRow()
        // .addComponents(
        //     new MessageButton()
        //     .setCustomId('resume')
        //     .setLabel('Resume')
        //     .setStyle('SECONDARY'),
        // )  
        
        // client.on('interactionCreate', interaction => {
        //     if (!interaction.isButton()) return;
        //     if (interaction['customId'] == 'resume') {
        //         queue.setPaused(false)
        //         interaction.reply({
        //             content: '👍',
        //             ephemeral: true
        //         })
        //     }
        // })
        
        interaction.reply({
            embeds: [
                new MessageEmbed()
                .setTitle('Paused the jams!')
                .setColor(mainHex)
            ],
            // components: [row],
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
        // const row  = new MessageActionRow()
        // .addComponents(
        //     new MessageButton()
        //     .setCustomId('resume')
        //     .setLabel('Pause')
        //     .setStyle('SECONDARY'),
        // )  
        
        // client.on('interactionCreate', interaction => {
        //     if (!interaction.isButton()) return;
        //     if (interaction['customId'] == 'resume') {
        //         queue.setPaused(true)
        //         interaction.reply({
        //             content: '👍',
        //             ephemeral: true
        //         })
        //     }
        // })

        interaction.reply({
            embeds: [
                new MessageEmbed()
                .setTitle('Resumed the jams!')
                .setColor(mainHex)
            ],
            // components: [row],
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
    const cpu = osu.cpu
    const mem = osu.mem
    const uptime = Math.round(client.uptime / 1000 / 60 / 60 / 24)

    cpu.usage().then(cpuPercentage => {
        mem.info().then(info => {
            const embed = new MessageEmbed()
                .setColor(mainHex)
                .setTitle('Jams Stats')
                .setThumbnail('https://jamsbot.com/assets/img/logo.png')
                .addField("Servers:", `${guilds}`, true)
                .addField('CPU %:', `${cpuPercentage}`, true)
                .addField('Mem. %:', `${info.freeMemPercentage}%`, true)
                .addField('Ping:', `${Math.round(client.ws.ping)}ms`, true)
                .addField('Uptime:', `${uptime} Days`, true)
                .addField('Library:', 'Discord.JS', true)
                .addField('Links', '[🌐 Website](https://jamsbot.com) | [<:invite:823987169978613851> Invite](https://jamsbot.com/invite) | [<:discord:823989269626355793> Support](https://jamsbot.com/support) | [<:upvote:823988328306049104> Vote](https://top.gg/bot/935801319569104948/vote)')
            interaction.reply({
                embeds: [embed],
            })
            cmdRun(user,cmdName)
        });
    });
}

// Loop Command
async function loopCmd(user,guild,interaction) {
    const cmdName = 'loop'

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
        var loopMode = queue.repeatMode

        if (loopMode != 1) {
            await queue.setRepeatMode(1)
            const embed = new MessageEmbed() 
            .setTitle(`Looping ${queue.current.title}`)
            .setColor(mainHex)
            interaction.reply({
                embeds: [embed],
            })
            cmdRun(user,cmdName)
        }
    }
}

// Loop Queue Command
async function loopqueueCmd(user,guild,interaction) {
    const cmdName = 'loopqueue'

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
        var loopMode = queue.repeatMode

        if (loopMode != 2) {
            await queue.setRepeatMode(2)
            const embed = new MessageEmbed() 
            .setTitle(`Looping queue`)
            .setColor(mainHex)
            interaction.reply({
                embeds: [embed],
            })
            cmdRun(user,cmdName)
        }
    }
}

// Stop loop command
async function stoploopCmd(user,guild,interaction) {
    const cmdName = 'stoploop'

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
        var loopMode = queue.repeatMode

        if (loopMode != 0) {
            await queue.setRepeatMode(0)
            const embed = new MessageEmbed() 
            .setTitle(`Stopped looping`)
            .setColor(mainHex)
            interaction.reply({
                embeds: [embed],
            })
            cmdRun(user,cmdName)
        }
    }
}

// Info Command
function infoCmd(user,guild,interaction) {
    const cmdName = 'info'

    const embed = new MessageEmbed()
    .setTitle('Jams Info')
    .setColor(mainHex)
    .setThumbnail('https://jamsbot.com/assets/img/logo.png')
    .setDescription('Jams is the best music bot.')
    .setFields([
        { name: 'Prefix', value: 'Jams functions off Discords `\`/`\` command system. So `\`/`\`', inline: false },
        { name: 'Platforms', value: 'Jams can play music from Spotify, YouTube, Soundcloud, Reverbnation, Vimeo, or Facebook', inline: false },
        { name: 'Commands', value: 'To view all the commands for Jams, use `\`/help`\`', inline: false },
        { name: 'Support', value: 'If you need help, click [Here](https://jamsbot.com/support)', inline: false },
        { name: 'Invite', value: 'If you want to invite the bot you can click [Here](https://jamsbot.com/invite), or click the bots profile', inline: false },
        { name: 'Links', value: '[🌐 Website](https://jamsbot.com) | [<:invite:823987169978613851> Invite](https://jamsbot.com/invite) | [<:discord:823989269626355793> Support](https://jamsbot.com/support) | [<:upvote:823988328306049104> Vote](https://top.gg/bot/935801319569104948/vote) | [<:upvote:823988328306049104> Vote](https://top.gg/bot/935801319569104948/vote)', inline: false }
    ])
    interaction.reply({
        embeds: [embed],
    })
    cmdRun(user,cmdName)
}

// lyrics command
async function lyricsCmd(user,guild,interaction) {
    const cmdName = 'lyrics'

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
        const song = queue.current
        const songTitle = song.title
        lyricsClient.search(songTitle)
            .then(x => {
                const embed = new MessageEmbed()

                if (x != null) {
                    embed.setTitle(`Lyrics for ${songTitle}`)
                    embed.setColor(mainHex)
                    embed.setDescription(x.lyrics)
                    embed.setThumbnail(x.thumbnail)
                    embed.setAuthor({name: `${x.artist.name}`, iconURL: x.artist.image})
                    interaction.reply({
                        embeds: [embed],
                    })
                } else {
                    embed.setTitle('Can not get lyrics')
                    embed.setColor('RED')
                    interaction.reply({
                        embeds: [embed],
                        ephemeral: true
                    })
                }

                cmdRun(user,cmdName)
            })
            .catch(console.error);
    }
}

// volume command
async function volumeCmd(user,guild,interaction,vol) {
    const cmdName = 'volume'

    const queue = client.player.getQueue(guild.id) 

    if (!queue) {
        const embed = new MessageEmbed()
        .setTitle('No songs in queue')
        .setColor('RED')
        interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
    } else {
        if (vol > 250) {
            const embed = new MessageEmbed()
            .setTitle('Volume too high')
            .setColor('RED')
            interaction.reply({
                embeds: [embed],
                ephemeral: true
            })
        } else {
            await queue.setVolume(vol)
            const embed = new MessageEmbed()
            .setTitle(`Volume set to ${vol}`)
            .setColor(mainHex)
            interaction.reply({
                embeds: [embed],
            })
        }
    }
    cmdRun(user,cmdName)
}

async function filterCmd(user,guild,interaction,filter) {
    const cmdName = 'filter'

    const queue = client.player.getQueue(guild.id)

    if (!queue) {
        const embed = new MessageEmbed()
        .setTitle('No songs in queue')
        .setColor('RED')
        interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
    } else {
        if (filter == 'off') {

            var obj = {}
            const fEnabled = queue.getFiltersEnabled()
            obj[fEnabled] = false
            await queue.setFilters(obj)

            const embed = new MessageEmbed()
            .setTitle('Filters disabled')
            .setColor(mainHex)
            interaction.reply({
                embeds: [embed],
            })
 
        } else {

            var obj = {}
            obj[filter] = !queue.getFiltersEnabled().includes(filter),
            await queue.setFilters(obj)

            const embed = new MessageEmbed()
            .setTitle(`Filter set to ${filter}`)
            .setColor(mainHex)
            interaction.reply({
                embeds: [embed],
            })
        }
    }
    cmdRun(user,cmdName)
}

// Leaderboard command
async function leaderboardCmd(user,guild,interaction) {
    const cmdName = 'leaderboard'
    const guildId = interaction.guild.id

    const embed = await listenerClient.generateLeaderboard({
        color: mainHex,
        guild: interaction.guild,
        top: 10
    })

    interaction.reply({
        embeds: [embed]
    })
    cmdRun(user,cmdName)
}

// LAVALINK TESTING
// lavalink play
async function lavalinkJoin(user, guild, interaction, search) {
    
    if (!interaction.member.voice.channel) {
        const embed = new MessageEmbed()
        .setTitle('Error: You are not in a voice channel')
        .setColor('RED')
        interaction.reply({
            embeds: [embed],
            ephemeral: true
        })
    } else {

        const songs = await getSongs(`ytsearch:${search}`)
        const track = songs.data.tracks[0]
        console.log(track)
        const player = await lava.join({
            guild: guild.id, // Guild id
            channel: interaction.member.voice.channel.id, // Channel id
            node: "1" // lavalink node id, based on array of nodes
        }, {
            selfdeaf: true
        });

        const playing = await player.play(player, track)

        if (playing) {
            console.log(player)
        }

        player.once("error", error => console.error(error));
    
        interaction.reply({
            content: 'ass'
        })
    }
}

// play function
async function lavaplay(player,track) {
    const playing = await player.play(track.track)
    return playing
}

// Get song function
async function getSongs(search) {
    const node = lava.idealNodes[0];

    const params = new URLSearchParams();
    params.append("identifier", search);

    const request = await axios({
        method: 'get',
        url: `http://${node.host}:${node.port}/loadtracks?${params}`,
        responseType: 'json',
        headers: { Authorization: node.password }
    })

    return request
}

// Run bot
client.login(process.env.TOKEN);
// client.login(process.env.BETA_TOKEN);