/* Magic Mirror
 * Node Helper: MMM-DailyHadith
 *
 * Loads hadiths from a local JSON file and picks one per day (or at random).
 */

const fs = require("fs");
const path = require("path");
const NodeHelper = require("node_helper");

const DEFAULT_DATA_FILE = "data/hadiths.json";

module.exports = NodeHelper.create({
	hadithCache: null,
	cacheFile: null,
	directoryIndex: null,
	directoryPath: null,
	bookCache: {},

	start() {
		console.log(`Starting node_helper for ${this.name}`);
	},

	getDayOfYear(date) {
		const start = new Date(date.getFullYear(), 0, 0);
		const diff = date - start;
		const oneDay = 1000 * 60 * 60 * 24;
		return Math.floor(diff / oneDay);
	},

	resolvePath(dataFile) {
		return path.join(__dirname, dataFile);
	},

	readJson(filePath) {
		return JSON.parse(fs.readFileSync(filePath, "utf8"));
	},

	loadHadithFile(dataFile) {
		const filePath = this.resolvePath(dataFile);

		if (!fs.existsSync(filePath)) {
			throw new Error(`Data file not found: ${dataFile}`);
		}

		if (fs.statSync(filePath).isDirectory()) {
			return this.loadHadithDirectory(filePath);
		}

		if (this.hadithCache && this.cacheFile === filePath) {
			return this.hadithCache;
		}

		this.hadithCache = this.readJson(filePath);
		this.cacheFile = filePath;
		this.directoryIndex = null;
		this.directoryPath = null;
		this.bookCache = {};
		console.log(`${this.name}: loaded ${this.hadithCache.total || this.hadithCache.hadiths.length} hadiths from ${dataFile}`);

		return this.hadithCache;
	},

	loadHadithDirectory(directoryPath) {
		if (this.directoryIndex && this.cacheFile === directoryPath) {
			return this.directoryIndex;
		}

		const indexPath = path.join(directoryPath, "index.json");
		if (!fs.existsSync(indexPath)) {
			throw new Error(`Missing index.json in ${directoryPath}`);
		}

		const index = this.readJson(indexPath);
		const books = (index.books || []).map((book) => {
			let bookPath = this.resolvePath(book.file);
			if (!fs.existsSync(bookPath)) {
				bookPath = path.join(directoryPath, path.basename(book.file));
			}
			if (!fs.existsSync(bookPath)) {
				throw new Error(`Book file not found: ${book.file}`);
			}

			return {
				name: book.name,
				file: bookPath,
				count: book.count
			};
		});

		const total = books.reduce((sum, book) => sum + book.count, 0);
		this.directoryIndex = {
			collection: index.label || "Hadith Collection",
			total,
			books,
			isDirectory: true
		};
		this.cacheFile = directoryPath;
		this.directoryPath = directoryPath;
		this.hadithCache = null;
		this.bookCache = {};
		console.log(`${this.name}: indexed ${total} hadiths in ${books.length} books (${directoryPath})`);

		return this.directoryIndex;
	},

	loadBookHadiths(book) {
		if (this.bookCache[book.file]) {
			return this.bookCache[book.file];
		}

		const bookData = this.readJson(book.file);
		this.bookCache[book.file] = bookData.hadiths || [];
		return this.bookCache[book.file];
	},

	pickHadith(data, rotationMode) {
		if (data.isDirectory) {
			return this.pickHadithFromDirectory(data, rotationMode);
		}

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

	pickHadithFromDirectory(data, rotationMode) {
		const total = data.total;
		if (!total || !data.books.length) {
			throw new Error("No hadiths found in data directory.");
		}

		let index = 0;
		if (rotationMode === "random") {
			index = Math.floor(Math.random() * total);
		} else {
			index = this.getDayOfYear(new Date()) % total;
		}

		let offset = 0;
		for (const book of data.books) {
			if (index < offset + book.count) {
				const hadiths = this.loadBookHadiths(book);
				const localIndex = index - offset;
				if (hadiths[localIndex]) {
					return hadiths[localIndex];
				}
				throw new Error(`Hadith missing in ${book.name}`);
			}
			offset += book.count;
		}

		const hadiths = this.loadBookHadiths(data.books[0]);
		return hadiths[0];
	},

	loadWithFallback(dataFile) {
		const candidates = [dataFile || DEFAULT_DATA_FILE];
		if (candidates[0] !== DEFAULT_DATA_FILE) {
			candidates.push(DEFAULT_DATA_FILE);
		}

		let lastError = null;
		for (const candidate of candidates) {
			try {
				return {
					data: this.loadHadithFile(candidate),
					dataFile: candidate
				};
			} catch (error) {
				lastError = error;
				console.warn(`${this.name}: could not load ${candidate} — ${error.message}`);
			}
		}

		throw lastError || new Error("Could not load hadith data.");
	},

	socketNotificationReceived(notification, payload) {
		if (notification !== "GET_HADITH") {
			return;
		}

		try {
			const { data } = this.loadWithFallback(payload.dataFile);
			const hadith = this.pickHadith(data, payload.rotationMode || "daily");

			this.sendSocketNotification("HADITH_RESULT", {
				hadith,
				collection: data.collection || data.book || ""
			});
		} catch (error) {
			console.error(`${this.name}:`, error);
			this.sendSocketNotification("HADITH_ERROR", {
				message: error.message
			});
		}
	}
});
