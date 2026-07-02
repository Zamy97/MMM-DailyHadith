# MMM-DailyHadith

A [MagicMirror²](https://github.com/MichMich/MagicMirror) module that shows a **daily hadith** from a **local JSON file** — no API, no internet needed after install.

Similar layout to [MMM-RandomQuranAyah](https://github.com/slametps/MMM-RandomQuranAyah), but uses bundled hadith data and rotates one hadith per day.

## Features

- Local hadith collection (**5,473 hadiths** bundled)
- Same hadith all day, changes at midnight
- Optional random rotation mode
- Arabic + English + reference
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
		showArabic: true,
		showTranslation: true,
		showReference: true,
		showNarrator: true,
		rotationMode: "daily",
		updateInterval: 60 * 60 * 1000
	}
}
```

Restart MagicMirror. No `npm install` required.

## Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `showTitle` | Show "Hadith of the Day" heading | `true` |
| `showArabic` | Show Arabic text | `true` |
| `showTranslation` | Show English translation | `true` |
| `showNarrator` | Show narrator line before text | `true` |
| `showReference` | Show hadith reference | `true` |
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

## Rebuilding the data file

To refresh or customize the bundled data:

```bash
cd ~/MagicMirror/modules/MMM-DailyHadith
npm run build:data
```

Edit `scripts/build-hadiths.js` to add or remove sources from [hadith-json](https://github.com/AhmedBaset/hadith-json).

## Data source

Bundled collections listed above (~6.3 MB total).  
Text prepared from [AhmedBaset/hadith-json](https://github.com/AhmedBaset/hadith-json) (sourced from [sunnah.com](https://sunnah.com)).

You can add more collections by dropping JSON files into `data/`.

## Credits

- Inspired by [MMM-RandomQuranAyah](https://github.com/slametps/MMM-RandomQuranAyah)
- Hadith text via [hadith-json](https://github.com/AhmedBaset/hadith-json)

## License

MIT
