# MMM-DailyHadith

A [MagicMirror²](https://github.com/MichMich/MagicMirror) module that shows a **daily hadith** from a **local JSON file** — no API, no internet needed after install.

Similar layout to [MMM-RandomQuranAyah](https://github.com/slametps/MMM-RandomQuranAyah), but uses bundled hadith data and rotates one hadith per day.

## Features

- Local hadith collection (**5,473 hadiths** bundled)
- Same hadith all day, changes at midnight
- Optional random rotation mode
- Arabic + English + reference
- **Topic** (chapter name) for every hadith
- **Teaching summary** (short extract) for every hadith
- **Bangla translation** where available (Nawawi 40 + Bangla chapter topics for Riyad)
- Works offline

## Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/Zamy97/MMM-DailyHadith.git
```

Add to `~/MagicMirror/config/config.js`:

```js
{
	module: "MMM-DailyHadith",
	position: "bottom_bar",
	config: {
		showTitle: true,
		showTopic: true,
		showSummary: true,
		showArabic: true,
		showTranslation: true,
		showBangla: true,
		showReference: true,
		showNarrator: true,
		language: "en",
		rotationMode: "daily",
		updateInterval: 60 * 60 * 1000
	}
}
```

Restart MagicMirror. No `npm install` required.

**The hadith database (`data/hadiths.json`, ~7.6 MB) is pre-built and included in this repo.** Clone/pull is enough — do not run `npm run build:data` on the Pi.

## Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `showTitle` | Show "Hadith of the Day" heading | `true` |
| `showTopic` | Show chapter/topic line | `true` |
| `showSummary` | Show short teaching summary | `true` |
| `showArabic` | Show Arabic text | `true` |
| `showTranslation` | Show English translation | `true` |
| `showBangla` | Show Bangla translation (when bundled) | `true` |
| `showNarrator` | Show narrator line before text | `true` |
| `showReference` | Show hadith reference | `true` |
| `language` | UI labels + prefer Bangla topic/summary: `en` or `bn` | `en` |
| `dataFile` | Path to JSON file (relative to module) | `data/hadiths.json` |
| `rotationMode` | `"daily"` or `"random"` | `"daily"` |
| `updateInterval` | How often to refresh (ms) | `3600000` (1 hour) |
| `animationSpeed` | DOM update animation (ms) | `2000` |

## Custom hadith collection

Create your own `data/my-hadiths.json`:

```json
{
	"collection": "My Hadith Collection",
	"hadiths": [
		{
			"id": 1,
			"arabic": "نص الحديث",
			"narrator": "Narrated ...",
			"text": "The hadith text in English.",
			"textBn": "বাংলা অনুবাদ (optional)",
			"topic": "The Book of Good Manners",
			"topicBn": "আদব ও শিষ্টাচার (optional)",
			"summary": "Short teaching of the hadith.",
			"summaryBn": "সংক্ষিপ্ত শিক্ষা (optional)",
			"reference": "Sahih al-Bukhari 1"
		}
	]
}
```

Then in config:

```js
dataFile: "data/my-hadiths.json"
```

## How daily rotation works

The module picks hadith index = `dayOfYear % numberOfHadiths`. With 5,473 hadiths, you get a unique hadith each day for about **15 years** before the cycle repeats.

## Bangla and teaching summary

| Field | Coverage |
|-------|----------|
| `summary` | All 5,473 hadiths (auto-extracted from English) |
| `topic` | All hadiths (chapter name) |
| `topicBn` | Riyad as-Salihin chapters (Bangla topic names) |
| `textBn` | Nawawi 40 (42 hadiths) via [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api) |
| `summaryBn` | Nawawi 40 (when Bangla text exists) |

Set `language: "bn"` to use Bangla UI labels and prefer Bangla topic/summary when available.

Full Bangla text for Riyad/Bukhari/Muslim is not bundled yet (no open bulk dataset matched to this collection). You can add `textBn` to your own JSON entries.

## Bundled collections (5,473 hadiths)

| Collection | Hadiths |
|------------|---------|
| Riyad as-Salihin | 1,896 |
| Bulugh al-Maram | 1,767 |
| Al-Adab Al-Mufrad | 1,326 |
| Shamail al-Muhammadiyah | 402 |
| Nawawi 40 | 42 |
| Forty Hadith Qudsi | 40 |

At one hadith per day, that's **~15 years** before the cycle repeats.

## Rebuilding the data file (maintainers only)

The built data lives in `data/hadiths.json` and is **saved in GitHub**. Mirror users only need `git pull`.

To rebuild on your computer (or via GitHub Actions → **Build Hadith Data** → Run workflow):

```bash
cd MMM-DailyHadith
npm run build:data
git add data/hadiths.json data/build-info.json
git commit -m "Rebuild hadith data"
git push
```

Edit `scripts/build-hadiths.js` to add or remove sources from [hadith-json](https://github.com/AhmedBaset/hadith-json).

## Data source

Bundled collections listed above (~7.6 MB total).  
English/Arabic via [hadith-json](https://github.com/AhmedBaset/hadith-json). Bangla via [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api) where available.

You can add more collections by dropping JSON files into `data/`.

## Credits

- Inspired by [MMM-RandomQuranAyah](https://github.com/slametps/MMM-RandomQuranAyah)
- Hadith text via [hadith-json](https://github.com/AhmedBaset/hadith-json)
- Bangla text via [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api)

## License

MIT
