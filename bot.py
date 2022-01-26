import discord
from discord.ext import commands
import os
from dotenv import load_dotenv
import mysql.connector
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

# Load .env
load_dotenv()

# Define stuff 
bpcR = 80
bpcG = 100
bpcB = 247

# spotipy stuff
sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials())

# Set bot stuff
bot = commands.Bot(command_prefix = "j!")
bot.remove_command('help')

# Run on bot start
@bot.event
async def on_ready():
    await bot.change_presence(activity=discord.Activity(type=discord.ActivityType.listening, name="Jams ~ j!help"))

    print('Online')

# Help command
@bot.command()
async def help(ctx):
    embed = discord.Embed(title='Jams Help', color=discord.Color.from_rgb(bpcR, bpcG, bpcB))

    await ctx.send(embed=embed)

# play command
@bot.command()
async def play(ctx, *, search):

    if ctx.author.voice is None:
        embed = discord.Embed(title='You are not in a VC', description='Please join a voice channel and try again', color=discord.Color.red())
        await ctx.send(embed=embed)
    

    if ctx.voice_client is not None:
        await ctx.voice_client.disconnect()

    await ctx.author.voice.channel.connect()

    results1 = sp.search(search)
#https://open.spotify.com/track/4RCWB3V8V0dignt99LZ8vH?si=6c3522cc1e8749be

    songUrl = results1['tracks']['items'][0]['external_urls']
    
    ctx.voice_client.play(discord.PCMVolumeTransformer(discord.FFmpegPCMAudio(f"{songUrl}")))

# leave command
@bot.command()
async def leave(ctx):

    if ctx.voice_client is None:
        embed = discord.Embed(title='I am not in a VC', description='There is no voice channel for me to leave', color=discord.Color.red())
        await ctx.send(embed=embed)
    
    if ctx.voice_client is not None:
        embed = discord.Embed(title='Successfully left VC', color=discord.Color.from_rgb(bpcR, bpcG, bpcB))
        await ctx.voice_client.disconnect()
        await ctx.send(embed=embed)

# Run bot
bot.run(os.getenv('TOKEN'))