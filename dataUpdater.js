const axios = require('axios');
const fs = require('fs');

class DataUpdater {
    constructor(addedUrl, filePath, releasedFilePath, updateInterval = 10000, cleanupInterval = 300000) {
        this.addedUrl = addedUrl;
        this.filePath = filePath;
        this.releasedFilePath = releasedFilePath;
        this.updateInterval = updateInterval;
        this.cleanupInterval = cleanupInterval;
        this.coins = {}; // Stores coins with their timestamps
        this.publishedCoins = new Set(); // Track published coins
        this.loadReleasedCoins(); // Load released coins initially
        this.init(); // Initialize the updater
    }

    init() {
        this.startUpdating();
        this.startCleanup();
    }

    loadReleasedCoins() {
        if (fs.existsSync(this.releasedFilePath)) {
            const rawData = fs.readFileSync(this.releasedFilePath);
            const releasedCoins = JSON.parse(rawData);
            releasedCoins.forEach(coin => this.publishedCoins.add(coin.tokenAddress));
        }
    }

    async fetchJson(url) {
        try {
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            console.error(`Error fetching data from ${url}:`, error);
            return [];
        }
    }

    async updateData() {
        const addedData = await this.fetchJson(this.addedUrl);
        this.processData(addedData);
        this.saveDataToFile();
    }

    processData(data) {
        const newCoins = [];
        data.forEach(coin => {
            const coinId = `${coin.tokenAddress}`;
            if (!this.coins[coinId] && !this.publishedCoins.has(coin.tokenAddress)) {
                this.coins[coinId] = { ...coin, timestamp: Date.now() };
                this.publishedCoins.add(coin.tokenAddress);
                newCoins.push(coin);
            }
        });
        if (newCoins.length > 0) {
            this.saveReleasedCoins(newCoins);
        }
    }

    saveDataToFile() {
        const coinsArray = Object.values(this.coins);
        fs.writeFileSync(this.filePath, JSON.stringify(coinsArray, null, 2));
    }

    saveReleasedCoins(newCoins) {
        const releasedCoins = newCoins.map(coin => ({
            tokenName: coin.tokenName,
            tokenTicker: coin.tokenTicker,
            tokenAddress: coin.tokenAddress,
            img_url: coin.img_url
        }));
        let existingReleasedCoins = [];
        if (fs.existsSync(this.releasedFilePath)) {
            const rawData = fs.readFileSync(this.releasedFilePath);
            existingReleasedCoins = JSON.parse(rawData);
        }
        const updatedReleasedCoins = [...existingReleasedCoins, ...releasedCoins];
        fs.writeFileSync(this.releasedFilePath, JSON.stringify(updatedReleasedCoins, null, 2));
    }

    startUpdating() {
        this.updateData();
        setInterval(() => this.updateData(), this.updateInterval);
    }

    cleanupOldCoins() {
        const now = Date.now();
        const thirtyMinutes = 30 * 60 * 1000;
        for (const [coinId, coin] of Object.entries(this.coins)) {
            if (now - coin.timestamp > thirtyMinutes) {
                delete this.coins[coinId];
                this.publishedCoins.delete(coin.tokenAddress);
            }
        }
        this.saveDataToFile();
    }

    startCleanup() {
        this.cleanupOldCoins();
        setInterval(() => this.cleanupOldCoins(), this.cleanupInterval);
    }
}

module.exports = DataUpdater;
