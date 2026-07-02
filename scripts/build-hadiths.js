#!/usr/bin/env node
/**
 * Builds data/hadiths.json from hadith-json sources on GitHub.
 * Adds topic, teaching summary, and Bangla where available.
 * Run: npm run build:data
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const SOURCES = [
	{
		key: "riyad_assalihin",
		url: "https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/other_books/riyad_assalihin.json",
		referencePrefix: "Riyad as-Salihin",
		banglaEdition: null
	},
	{
		key: "aladab_almufrad",
		url: "https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/other_books/aladab_almufrad.json",
		referencePrefix: "Al-Adab Al-Mufrad",
		banglaEdition: null
	},
	{
		key: "bulugh_almaram",
		url: "https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/other_books/bulugh_almaram.json",
		referencePrefix: "Bulugh al-Maram",
		banglaEdition: null
	},
	{
		key: "shamail_muhammadiyah",
		url: "https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/other_books/shamail_muhammadiyah.json",
		referencePrefix: "Shamail al-Muhammadiyah",
		banglaEdition: null
	},
	{
		key: "nawawi40",
		url: "https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/forties/nawawi40.json",
		referencePrefix: "Nawawi 40",
		banglaEdition: "ben-nawawi"
	},
	{
		key: "qudsi40",
		url: "https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/forties/qudsi40.json",
		referencePrefix: "Forty Hadith Qudsi",
		banglaEdition: null
	}
];

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
			return trimSummary(match[1]);
		}
	}

	const cleaned = body.replace(/\[.*?\]/g, "").trim();
	const sentence = cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned;
	return trimSummary(sentence);
}

function buildSummaryBn(textBn) {
	if (!textBn) {
		return "";
	}

	const quoteMatch = textBn.match(/["“]([^"”]{20,})["”]/);
	if (quoteMatch) {
		return trimSummary(quoteMatch[1], 280);
	}

	const sentence = textBn.split(/[।.!?]\s+/)[0] || textBn;
	return trimSummary(sentence, 280);
}

function trimSummary(value, maxLength = 240) {
	const cleaned = value.replace(/\s+/g, " ").trim();
	if (cleaned.length <= maxLength) {
		return cleaned;
	}
	return `${cleaned.slice(0, maxLength - 3)}...`;
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

async function main() {
	const allHadiths = [];
	const collections = [];
	const banglaStats = { total: 0, withBangla: 0 };

	for (const source of SOURCES) {
		console.log(`Fetching ${source.referencePrefix}...`);
		const raw = await fetchJson(source.url);

		let banglaByNumber = null;
		if (source.banglaEdition) {
			console.log(`  Loading Bangla (${source.banglaEdition})...`);
			banglaByNumber = await loadBanglaEdition(source.banglaEdition);
		}

		const hadiths = transformCollection(raw, source, banglaByNumber);
		allHadiths.push(...hadiths);
		collections.push({
			name: source.referencePrefix,
			count: hadiths.length,
			banglaCount: hadiths.filter((hadith) => hadith.textBn).length
		});

		const banglaCount = hadiths.filter((hadith) => hadith.textBn).length;
		banglaStats.withBangla += banglaCount;
		banglaStats.total += hadiths.length;
		console.log(`  + ${hadiths.length} hadiths (${banglaCount} with Bangla)`);
	}

	const output = {
		collection: "Daily Hadith Collection",
		attribution: {
			englishArabic: "AhmedBaset/hadith-json (sunnah.com)",
			bangla: "fawazahmed0/hadith-api (ben-nawawi and other ben-* editions)"
		},
		collections,
		total: allHadiths.length,
		banglaAvailable: banglaStats.withBangla,
		hadiths: allHadiths.map((hadith, index) => ({
			...hadith,
			id: index + 1
		}))
	};

	const outPath = path.join(__dirname, "..", "data", "hadiths.json");
	fs.mkdirSync(path.dirname(outPath), { recursive: true });
	fs.writeFileSync(outPath, JSON.stringify(output));

	const sizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
	console.log(`\nWrote ${output.total} hadiths to ${outPath} (${sizeMb} MB)`);
	console.log(`Bangla text available for ${output.banglaAvailable} hadiths`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
