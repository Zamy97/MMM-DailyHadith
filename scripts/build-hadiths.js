#!/usr/bin/env node
/**
 * Builds hadith JSON databases from hadith-json + Bangla sources.
 *
 *   npm run build:data      -> data/hadiths.json (~7 MB, daily mirror module)
 *   npm run build:library   -> data/hadiths-library.json (~25+ MB, full archive)
 *   npm run build:all       -> both
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const BASE = "https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book";

const DAILY_SOURCES = [
	book("riyad_assalihin", `${BASE}/other_books/riyad_assalihin.json`, "Riyad as-Salihin"),
	book("aladab_almufrad", `${BASE}/other_books/aladab_almufrad.json`, "Al-Adab Al-Mufrad"),
	book("bulugh_almaram", `${BASE}/other_books/bulugh_almaram.json`, "Bulugh al-Maram"),
	book("shamail_muhammadiyah", `${BASE}/other_books/shamail_muhammadiyah.json`, "Shamail al-Muhammadiyah"),
	book("nawawi40", `${BASE}/forties/nawawi40.json`, "Nawawi 40", "ben-nawawi"),
	book("qudsi40", `${BASE}/forties/qudsi40.json`, "Forty Hadith Qudsi")
];

const LIBRARY_EXTRA_SOURCES = [
	book("bukhari", `${BASE}/the_9_books/bukhari.json`, "Sahih al-Bukhari", "ben-bukhari"),
	book("muslim", `${BASE}/the_9_books/muslim.json`, "Sahih Muslim", "ben-muslim"),
	book("abudawud", `${BASE}/the_9_books/abudawud.json`, "Sunan Abu Dawud", "ben-abudawud"),
	book("tirmidhi", `${BASE}/the_9_books/tirmidhi.json`, "Jami at-Tirmidhi", "ben-tirmidhi"),
	book("nasai", `${BASE}/the_9_books/nasai.json`, "Sunan an-Nasa'i", "ben-nasai"),
	book("ibnmajah", `${BASE}/the_9_books/ibnmajah.json`, "Sunan Ibn Majah", "ben-ibnmajah"),
	book("malik", `${BASE}/the_9_books/malik.json`, "Muwatta Malik", "ben-malik"),
	book("mishkat_almasabih", `${BASE}/other_books/mishkat_almasabih.json`, "Mishkat al-Masabih"),
	book("ahmed", `${BASE}/the_9_books/ahmed.json`, "Musnad Ahmad"),
	book("darimi", `${BASE}/the_9_books/darimi.json`, "Sunan ad-Darimi")
];

function book(key, url, referencePrefix, banglaEdition = null) {
	return { key, url, referencePrefix, banglaEdition };
}

const TOPIC_BN = {
	"The Book of Good Manners": "আদব ও শিষ্টাচার",
	"The Book About the Etiquette of Eating": "খাদ্য গ্রহণের আদব",
	"The Book of Dress": "পোশাক-পরিচ্ছদ",
	"The Book of the Etiquette of Sleeping, Lying and Sitting etc": "ঘুম, শোয়া ও বসার আদব",
	"The Book of Greetings": "অভিবাদন",
	"The Book of Visiting the Sick": "রোগী দেখতে যাওয়া",
	"The Book of Etiquette of Traveling": "সফরের আদব",
	"The Book of Virtues": "গুণাবলি",
	"The Book of I'tikaf": "ইতিকাফ",
	"The Book of Hajj": "হজ্জ",
	"The Book of Jihad": "জিহাদ",
	"The Book of Knowledge": "ইলম",
	"The Book of Praise and Gratitude to Allah": "আল্লাহর প্রশংসা ও শোকর",
	"The Book of Supplicating Allah to Exalt the Mention of Allah's Messenger":
		"রাসূল (সা.)-এর শান বর্ণনার দুআ",
	"The Book of the Remembrance of Allah": "আল্লাহর যিকির",
	"The Book of Du'a (Supplications)": "দুআ",
	"The Book of the Prohibited actions": "নিষিদ্ধ কাজ",
	"The Book of Miscellaneous ahadith of Significant Values": "গুরুত্বপূর্ণ বিবিধ হাদীস",
	"The Book of Forgiveness": "ক্ষমা",
	"The Book of Miscellany": "বিবিধ"
};

const PRESETS = {
	daily: {
		file: "data/hadiths.json",
		infoFile: "data/build-info.json",
		label: "Daily Hadith Collection",
		sources: DAILY_SOURCES
	},
	library: {
		file: "data/library",
		infoFile: "data/build-info-library.json",
		label: "Full Hadith Library",
		sources: [...DAILY_SOURCES, ...LIBRARY_EXTRA_SOURCES],
		splitByBook: true
	},
	bangla: {
		file: "data/bangla",
		infoFile: "data/build-info-bangla.json",
		label: "Bangla Hadith Collection",
		sources: [...DAILY_SOURCES, ...LIBRARY_EXTRA_SOURCES].filter((source) => source.banglaEdition),
		splitByBook: true,
		banglaOnly: true
	}
};

function fetchJson(url) {
	return new Promise((resolve, reject) => {
		https
			.get(url, (res) => {
				if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
					fetchJson(res.headers.location).then(resolve).catch(reject);
					return;
				}

				if (res.statusCode !== 200) {
					reject(new Error(`HTTP ${res.statusCode} for ${url}`));
					return;
				}

				let data = "";
				res.on("data", (chunk) => {
					data += chunk;
				});
				res.on("end", () => {
					try {
						resolve(JSON.parse(data));
					} catch (error) {
						reject(error);
					}
				});
			})
			.on("error", reject);
	});
}

function getChapterMap(chapters) {
	const map = {};
	chapters.forEach((chapter) => {
		map[chapter.id] = chapter.english;
	});
	return map;
}

/**
 * Keep enough text to understand the teaching, but never cut mid-sentence.
 * Ends on the last complete sentence that fits in maxLength.
 */
function truncateAtSentence(value, maxLength = 520) {
	const cleaned = String(value || "")
		.replace(/\s+/g, " ")
		.trim();
	if (!cleaned || cleaned.length <= maxLength) {
		return cleaned;
	}

	const slice = cleaned.slice(0, maxLength);
	const sentenceEnd = /[.!?।…](?=\s|$)/g;
	let lastEnd = -1;
	let match;
	while ((match = sentenceEnd.exec(slice)) !== null) {
		lastEnd = match.index;
	}

	// Prefer a complete sentence once we have enough context to make sense.
	if (lastEnd >= 120) {
		return slice.slice(0, lastEnd + 1).trim();
	}

	const lastSpace = slice.lastIndexOf(" ");
	if (lastSpace > 80) {
		return `${slice.slice(0, lastSpace).trim()}…`;
	}

	return `${slice.trim()}…`;
}

function buildSummary(narrator, text) {
	if (!text) {
		return "";
	}

	let body = text;
	if (narrator && body.startsWith(narrator)) {
		body = body.slice(narrator.length).trim();
	}

	const quotePatterns = [
		/Messenger of Allah \(ﷺ\)[^"“]*["“]([^"”]+)["”]/i,
		/["“]([^"”]{30,})["”]/,
		/'([^']{30,})'/
	];

	for (const pattern of quotePatterns) {
		const match = body.match(pattern);
		if (match && match[1]) {
			return truncateAtSentence(match[1], 520);
		}
	}

	const cleaned = body.replace(/\[.*?\]/g, "").trim();
	return truncateAtSentence(cleaned, 520);
}

function buildSummaryBn(textBn) {
	if (!textBn) {
		return "";
	}

	const quoteMatch = textBn.match(/["“]([^"”]{20,})["”]/);
	if (quoteMatch) {
		return truncateAtSentence(quoteMatch[1], 520);
	}

	return truncateAtSentence(textBn, 520);
}

async function loadBanglaEdition(editionName) {
	const url = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${editionName}.min.json`;
	const raw = await fetchJson(url);
	const map = {};

	raw.hadiths.forEach((hadith) => {
		map[hadith.hadithnumber] = hadith.text;
	});

	return map;
}

function transformCollection(raw, source, banglaByNumber) {
	const chapterMap = getChapterMap(raw.chapters || []);

	return raw.hadiths.map((hadith) => {
		const narrator = hadith.english.narrator;
		const text = hadith.english.text.trim();
		const topic = chapterMap[hadith.chapterId] || "";
		const textBn = banglaByNumber?.[hadith.idInBook] || "";

		return {
			book: source.referencePrefix,
			id: hadith.idInBook,
			arabic: hadith.arabic,
			narrator,
			text,
			textBn,
			topic,
			topicBn: TOPIC_BN[topic] || "",
			summary: buildSummary(narrator, text),
			summaryBn: buildSummaryBn(textBn),
			reference: `${source.referencePrefix}, Hadith ${hadith.idInBook}`
		};
	});
}

function slugify(name) {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

function writeSingleFile(preset, output, banglaAvailable) {
	const outPath = path.join(__dirname, "..", preset.file);
	const infoPath = path.join(__dirname, "..", preset.infoFile);
	fs.mkdirSync(path.dirname(outPath), { recursive: true });
	fs.writeFileSync(outPath, JSON.stringify(output));

	const buildInfo = {
		builtAt: new Date().toISOString(),
		preset: preset.label,
		total: output.total,
		banglaAvailable,
		collections: output.collections,
		file: preset.file,
		sizeBytes: fs.statSync(outPath).size
	};
	fs.writeFileSync(infoPath, `${JSON.stringify(buildInfo, null, 2)}\n`);

	const sizeMb = (buildInfo.sizeBytes / (1024 * 1024)).toFixed(2);
	console.log(`\nWrote ${output.total} hadiths to ${preset.file} (${sizeMb} MB)`);
	console.log(`Bangla text available for ${banglaAvailable} hadiths`);

	return buildInfo;
}

function writeSplitLibrary(preset, collections, banglaAvailable) {
	const libraryDir = path.join(__dirname, "..", preset.file);
	fs.mkdirSync(libraryDir, { recursive: true });

	const index = {
		builtAt: new Date().toISOString(),
		preset: preset.banglaOnly ? "bangla" : "library",
		label: preset.label,
		total: 0,
		banglaAvailable: 0,
		books: []
	};

	let globalId = 1;

	const filePrefix = preset.file.replace(/\\/g, "/");

	for (const collection of collections) {
		let bookHadiths = collection.hadiths;
		if (preset.banglaOnly) {
			bookHadiths = bookHadiths.filter((hadith) => hadith.textBn);
		}

		bookHadiths = bookHadiths.map((hadith) => ({
			...hadith,
			id: globalId++
		}));

		const bookOutput = {
			book: collection.name,
			total: bookHadiths.length,
			banglaAvailable: bookHadiths.filter((hadith) => hadith.textBn).length,
			hadiths: bookHadiths
		};

		const filename = `${slugify(collection.name)}.json`;
		const bookPath = path.join(libraryDir, filename);
		fs.writeFileSync(bookPath, JSON.stringify(bookOutput));

		const sizeBytes = fs.statSync(bookPath).size;
		index.total += bookHadiths.length;
		index.banglaAvailable += bookOutput.banglaAvailable;
		index.books.push({
			name: collection.name,
			file: `${filePrefix}/${filename}`,
			count: bookHadiths.length,
			banglaCount: bookOutput.banglaAvailable,
			sizeBytes
		});

		const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
		console.log(`  -> ${filePrefix}/${filename} (${bookHadiths.length} hadiths, ${sizeMb} MB)`);
	}

	const indexPath = path.join(libraryDir, "index.json");
	fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

	const totalBytes = index.books.reduce((sum, book) => sum + book.sizeBytes, 0);
	const infoPath = path.join(__dirname, "..", preset.infoFile);
	const buildInfo = {
		builtAt: index.builtAt,
		preset: preset.banglaOnly ? "bangla" : "library",
		total: index.total,
		banglaAvailable: index.banglaAvailable,
		collections: index.books,
		file: preset.file,
		sizeBytes: totalBytes
	};
	fs.writeFileSync(infoPath, `${JSON.stringify(buildInfo, null, 2)}\n`);

	const sizeMb = (totalBytes / (1024 * 1024)).toFixed(2);
	console.log(`\nWrote ${index.total} hadiths across ${index.books.length} books (${sizeMb} MB total)`);
	console.log(`Bangla text available for ${index.banglaAvailable} hadiths`);

	return buildInfo;
}

async function buildPreset(presetName) {
	const preset = PRESETS[presetName];
	if (!preset) {
		throw new Error(`Unknown preset: ${presetName}. Use: daily or library`);
	}

	console.log(`\n=== Building ${preset.label} ===\n`);

	const collections = [];
	let banglaAvailable = 0;

	for (const source of preset.sources) {
		console.log(`Fetching ${source.referencePrefix}...`);
		const raw = await fetchJson(source.url);

		let banglaByNumber = null;
		if (source.banglaEdition) {
			console.log(`  Loading Bangla (${source.banglaEdition})...`);
			banglaByNumber = await loadBanglaEdition(source.banglaEdition);
		}

		const hadiths = transformCollection(raw, source, banglaByNumber);
		const banglaCount = hadiths.filter((hadith) => hadith.textBn).length;

		banglaAvailable += banglaCount;
		collections.push({
			name: source.referencePrefix,
			count: hadiths.length,
			banglaCount,
			hadiths
		});
		console.log(`  + ${hadiths.length} hadiths (${banglaCount} with Bangla)`);
	}

	if (preset.splitByBook) {
		return writeSplitLibrary(preset, collections, banglaAvailable);
	}

	const allHadiths = collections
		.flatMap((collection) => collection.hadiths)
		.filter((hadith) => !preset.banglaOnly || hadith.textBn);

	if (preset.banglaOnly) {
		banglaAvailable = allHadiths.length;
		console.log(`  = ${allHadiths.length} hadiths with Bangla text`);
	}

	const output = {
		collection: preset.label,
		preset: presetName,
		attribution: {
			englishArabic: "AhmedBaset/hadith-json (sunnah.com)",
			bangla: "fawazahmed0/hadith-api (ben-* editions)"
		},
		collections: collections.map(({ name, count, banglaCount }) => ({ name, count, banglaCount })),
		total: allHadiths.length,
		banglaAvailable,
		hadiths: allHadiths.map((hadith, index) => ({
			...hadith,
			id: index + 1
		}))
	};

	return writeSingleFile(preset, output, banglaAvailable);
}

async function main() {
	const mode = process.argv[2] || "daily";

	if (mode === "all") {
		await buildPreset("daily");
		await buildPreset("bangla");
		await buildPreset("library");
		return;
	}

	await buildPreset(mode);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
