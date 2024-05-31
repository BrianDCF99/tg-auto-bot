require('dotenv').config();
const { Bot } = require('grammy');
const { CoinData } = require('./coinData');
const DataUpdater = require('./dataUpdater');
const fs = require('fs');

// Initialize the bot with your token from the .env file
const bot = new Bot(process.env.BOT_TOKEN);

// File path to store user IDs and chat IDs
const USER_DATA_FILE = './user_logs.json';

// Load users and chats from file
let users = new Set();
let chatIds = new Set();
if (fs.existsSync(USER_DATA_FILE)) {
    try {
        const rawData = fs.readFileSync(USER_DATA_FILE);
        const { userIds, chatIds: savedChatIds } = JSON.parse(rawData);
        users = new Set(userIds);
        chatIds = new Set(savedChatIds);
    } catch (error) {
        console.error('Error reading or parsing user data file:', error);
        users = new Set();
        chatIds = new Set();
    }
}

// Save users and chats to file
const saveData = () => {
    fs.writeFileSync(USER_DATA_FILE, JSON.stringify({ userIds: [...users], chatIds: [...chatIds] }, null, 2));
};

// Log a message when the bot is starting
console.log('Bot is starting...');

// Handle all messages to track users
bot.on('message', (ctx) => {
    users.add(ctx.from.id);
    if (ctx.chat && ctx.chat.id) {
        chatIds.add(ctx.chat.id);
    }
    saveData();
    console.log(`User ${ctx.from.id} added. Chat ${ctx.chat.id} added.`);
});

// Create instances of CoinData
const coinDataImageAdded = new CoinData('./jsons/imageAdded.json', 'Image Added');
const coinDataDexPaid = new CoinData('./jsons/upcomingImages.json', 'Upcoming Image');

// Create instances of DataUpdater for Image Added and Upcoming Images
const imageAddedUpdater = new DataUpdater('http://ec2-3-76-37-115.eu-central-1.compute.amazonaws.com:8083/', './jsons/imageAdded.json', './jsons/imageAdded_sent.json');
const upcomingImagesUpdater = new DataUpdater('http://ec2-3-76-37-115.eu-central-1.compute.amazonaws.com:8083/dex', './jsons/upcomingImages.json', './jsons/upcomingImages_sent.json');

// Handle the /start command
bot.command('start', async (ctx) => {
    try {
        users.add(ctx.from.id);
        if (ctx.chat && ctx.chat.id) {
            chatIds.add(ctx.chat.id);
        }
        saveData();

        console.log(`Received /start command from user ${ctx.from.id}`);

        const welcomeMessage = `
Welcome ${ctx.from.first_name},

Enjoy getting the fastest Dex Screener updates before anyone else! This bot will send you notifications on Images that have just been added to the Dex Screener search tool.

However, ${bot.botInfo.first_name} will also notify you of Up-coming images BEFORE they show up on the search bar. That’s the real magic of this bot, and its power is in your hands!

**** NOTE: ****
The token address is copyable, so you can tap on it and have it ready to paste on your favourite trading platform.

Happy Trading! - ${bot.botInfo.first_name} Team =D
        `;

        await ctx.reply(welcomeMessage);
        console.log('Start message sent to user', ctx.from.id);
    } catch (error) {
        console.error('Error handling /start command:', error);
    }
});

// Periodically fetch data and send updates to all users and chats
const sendUpdates = async () => {
    const userIds = Array.from(users);
    const allChatIds = [...userIds, ...chatIds];
    await imageAddedUpdater.updateData();
    await upcomingImagesUpdater.updateData();
    await coinDataImageAdded.sendMessagesAndPhotos(bot, allChatIds, './jsons/imageAdded.json');
    await coinDataDexPaid.sendMessagesAndPhotos(bot, allChatIds, './jsons/upcomingImages.json');
};

setInterval(sendUpdates, 2000);

// Handle the /help command
bot.command('help', async (ctx) => {
    try {
        await ctx.reply(`
Hello! Welcome to Dex Images Bot.

This bot is used to detect up and coming images on Dex Screener, BEFORE they show up on Dex Screener itself, helping you catch those 10x trades on the daily!
        
To get started, you can use the following commands: 
/start - To start getting notifications on New Images
/help - To view this message again
        
Enjoy getting insider info and catch those 10x trades!
        `);
        console.log('Help message sent to user', ctx.from.id);
    } catch (error) {
        console.error('Error handling /help command:', error);
    }
});

// Log a message indicating the bot has started
console.log('Bot has started and is now listening for commands...');

// Start the bot
bot.start().catch(console.error);

