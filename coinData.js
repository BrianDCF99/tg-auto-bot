const fs = require('fs');

// Function to format numbers
function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) {
        return '$0';
    }
    if (typeof num !== 'number') {
        num = Number(num);
        if (isNaN(num)) {
            return '$0';
        }
    }
    if (num >= 1000000000) {
        return '$' + (num / 1000000000).toFixed(2) + 'B';
    } else if (num >= 1000000) {
        return '$' + (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return '$' + (num / 1000).toFixed(2) + 'k';
    }
    return '$' + num.toFixed(2);
}

// Function to escape special characters for MarkdownV2
function escapeMarkdownV2(text) {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

// Function to create a dynamic line separator
function createSeparator() {
    return escapeMarkdownV2('─'.repeat(15));  // You can adjust the number based on your preference
}

// Function to generate dynamic social links with separators
function generateSocialLinks(socials) {
    if (!socials) return '';

    const links = [];
    if (socials.website) {
        links.push(`[Website](${socials.website})`);
    }
    if (socials.twitter) {
        links.push(`[Twitter](${socials.twitter})`);
    }
    if (socials.telegram) {
        links.push(`[Telegram](${socials.telegram})`);
    }

    if (links.length === 0) return '';
    if (links.length === 1) return '\n' + links[0];

    return '\n' + links.join('   \\|   ');
}

// Define the emoji based on the type
const getTypeWithEmoji = (type) => {
    if (type === 'Upcoming Image') {
        return `🔵🔵🔵 *Info Update* 🔵🔵🔵`;
    } else if (type === 'Image Added') {
        return `🟢🟢🟢 *${escapeMarkdownV2(type)}* 🟢🟢🟢`;
    }
    return `*${escapeMarkdownV2(type)}*`; // Fallback if the type doesn't match
};

const getPumpFun = (pumpFun) => {
    if(pumpFun === 'true') {
        return `\n🚀🚀🚀  *PUMP FUN*  🚀🚀🚀`;
    }
    return '';
}

const getMintFreeze = (mintFreeze) => {
    if(mintFreeze === 'yes') {
        return `\nMint/Freeze Auth Disabled: ✅`;
    }else{
        return '\nMint/Freeze Auth Disabled: ❌';
    }
}

const getBurn = (burn) => {
    if(burn === 'yes') {
        return `\nLiquidity Burned: ✅`;
    }else{
        return '\nLiquidty Burned: ❌';
    }
}

const imgSrc = (imgURL) => imgURL.includes('pinata.cloud')
? imgURL.replace('gateway.pinata.cloud', 'cloudflare-ipfs.com')
: imgURL;

class CoinData {
    constructor(filePath, type) {
        this.filePath = filePath;
        this.type = type;
        this.sentCoins = new Set();
        this.loadSentCoins();
    }

    // Method to read data from the JSON file
    readData() {
        const rawData = fs.readFileSync(this.filePath);
        return JSON.parse(rawData);
    }

    // Method to load sent coins from a JSON file
    loadSentCoins() {
        const sentCoinsFilePath = this.filePath.replace('.json', '_sent.json');
        if (fs.existsSync(sentCoinsFilePath)) {
            const rawData = fs.readFileSync(sentCoinsFilePath);
            const sentCoins = JSON.parse(rawData);
            this.sentCoins = new Set(sentCoins);
        }
    }

    // Method to save sent coins to a JSON file
    saveSentCoins() {
        const sentCoinsFilePath = this.filePath.replace('.json', '_sent.json');
        fs.writeFileSync(sentCoinsFilePath, JSON.stringify([...this.sentCoins], null, 2));
    }

    // Method to format the info message
    formatInfoMessage(data) {
        const socialLinks = generateSocialLinks(data.socials);
        const separator = socialLinks ? `${socialLinks}` : '';
        return `
${getTypeWithEmoji(this.type)}${getPumpFun(data.pumpFun)}
*Name:* ${escapeMarkdownV2(data.tokenName)}
*Ticker:* ${escapeMarkdownV2(data.tokenTicker)}
*MC:* ${escapeMarkdownV2(formatNumber(data.marketCap))}
*Liq:* ${escapeMarkdownV2(formatNumber(data.totalLiquidity))}
*Address:* \`${escapeMarkdownV2(data.tokenAddress)}\`${getMintFreeze(data.mintFreeze)}${getBurn(data.liquidity_burned)}${separator}
${createSeparator()}
        `;
    }

    // Method to send the messages and photos for all tokens
    async sendMessagesAndPhotos(bot, userIds, filePath) {
        const data = this.readData(filePath);
        for (const token of data) {
            if (!this.sentCoins.has(token.tokenAddress)) {
                // Mark the token as sent before sending messages
                this.sentCoins.add(token.tokenAddress);
                this.saveSentCoins();

                try {
                    for (const userId of userIds) {
                        // Send the image first
                        await bot.api.sendPhoto(userId, imgSrc(token.img_url));

                        // Send the type and info message with disabled web page preview
                        const infoMessage = this.formatInfoMessage(token);
                        await bot.api.sendMessage(userId, infoMessage, { parse_mode: 'MarkdownV2', disable_web_page_preview: true });
                    }
                } catch (error) {
                    console.error('Error broadcasting message:', error);
                }
            }
        }
    }
}

module.exports = {
    CoinData
};