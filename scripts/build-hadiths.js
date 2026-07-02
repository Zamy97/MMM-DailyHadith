#!/usr/bin/env node
/**
 * Builds data/hadiths.json from hadith-json sources on GitHub.
 * Run: node scripts/build-hadiths.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const SOURCES = [
	{
		url: "https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/other_books/riyad_assalihin.json",
		referencePrefix: "Riyad as-Salihin"
	},
	{
		url: "https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/other_books/aladab_almufrad.json",
		referencePrefix: "Al-Adab Al-Mufrad"
	},
	{
		url: "https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/other_books/bulugh_almaram.json",
		referencePrefix: "Bulugh al-Maram"
	},
	{
		url: "https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/other_books/shamail_muhammadiyah.json",
		referencePrefix: "Shamail al-Muhammadiyah"
	},
	{
		url: "https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/forties/nawawi40.json",
		referencePrefix: "Nawawi 40"
	},
	{
		url: "https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/forties/qudsi40.json",
		referencePrefix: "Forty Hadith Qudsi"
	}
];

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

function transformCollection(raw, referencePrefix) {
	return raw.hadiths.map((hadith) => ({
		id: hadith.idInBook,
		arabic: hadith.arabic,
		narrator: hadith.english.narrator,
		text: hadith.english.text.trim(),
		reference: `${referencePrefix}, Hadith ${hadith.idInBook}`
	}));
}

async function main() {
	const allHadiths = [];
	const collections = [];

	for (const source of SOURCES) {
		console.log(`Fetching ${source.referencePrefix}...`);
		const raw = await fetchJson(source.url);
		const hadiths = transformCollection(raw, source.referencePrefix);
		allHadiths.push(...hadiths);
		collections.push({
			name: source.referencePrefix,
			count: hadiths.length
		});
		console.log(`  + ${hadiths.length} hadiths`);
	}

	const output = {
		collection: "Daily Hadith Collection",
		attribution:
			"English and Arabic text via AhmedBaset/hadith-json (sourced from sunnah.com).",
		collections,
		total: allHadiths.length,
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
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
