/* Magic Mirror
 * Node Helper: MMM-DailyHadith
 *
 * Loads hadiths from a local JSON file and picks one per day (or at random).
 */

const fs = require("fs");
const path = require("path");
const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
	hadithCache: null,
	cacheFile: null,

	start() {
		console.log(`Starting node_helper for ${this.name}`);
	},

	getDayOfYear(date) {
		const start = new Date(date.getFullYear(), 0, 0);
		const diff = date - start;
		const oneDay = 1000 * 60 * 60 * 24;
		return Math.floor(diff / oneDay);
	},

	loadHadithFile(dataFile) {
		const filePath = path.join(__dirname, dataFile);

		if (this.hadithCache && this.cacheFile === filePath) {
			return this.hadithCache;
		}

		const raw = fs.readFileSync(filePath, "utf8");
		this.hadithCache = JSON.parse(raw);
		this.cacheFile = filePath;
		console.log(`${this.name}: loaded ${this.hadithCache.total || this.hadithCache.hadiths.length} hadiths`);

		return this.hadithCache;
	},

	pickHadith(data, rotationMode) {
		const hadiths = data.hadiths;
		if (!hadiths || hadiths.length === 0) {
			throw new Error("No hadiths found in data file.");
		}

		let index = 0;
		if (rotationMode === "random") {
			index = Math.floor(Math.random() * hadiths.length);
		} else {
			index = this.getDayOfYear(new Date()) % hadiths.length;
		}

		return hadiths[index];
	},

	socketNotificationReceived(notification, payload) {
		if (notification !== "GET_HADITH") {
			return;
		}

		try {
			const data = this.loadHadithFile(payload.dataFile || "data/hadiths.json");
			const hadith = this.pickHadith(data, payload.rotationMode || "daily");

			this.sendSocketNotification("HADITH_RESULT", {
				hadith,
				collection: data.collection || ""
			});
		} catch (error) {
			console.error(`${this.name}:`, error);
			this.sendSocketNotification("HADITH_ERROR", {
				message: error.message
			});
		}
	}
});
