# Hadith data (pre-built)

Pre-built JSON — **committed to GitHub**. Clone/pull on the Pi; do not run `npm run build:*` there.

## Daily module (what the mirror uses today)

| File | Hadiths | Size |
|------|---------|------|
| `hadiths.json` | 5,473 | ~7.7 MB |
| `build-info.json` | metadata | tiny |

## Full library (for future MM modules)

| Path | Hadiths | Size | Bangla |
|------|---------|------|--------|
| `library/` (16 books) | 50,844 | ~141 MB | 35,452 |
| `library/index.json` | manifest | tiny | — |

Largest single file: `sahih-al-bukhari.json` (~28 MB). Split per book so GitHub accepts the repo (100 MB file limit).

### Library books

- Riyad as-Salihin, Al-Adab Al-Mufrad, Bulugh al-Maram, Shamail
- Nawawi 40, Forty Hadith Qudsi
- Sahih al-Bukhari, Sahih Muslim (with Bangla)
- Sunan Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, Muwatta Malik (with Bangla)
- Mishkat al-Masabih, Musnad Ahmad, Sunan ad-Darimi

## Pi update

```bash
git pull --ff-only
```

If local build files conflict:

```bash
git restore data/
git pull --ff-only
```

## Rebuild (Mac / GitHub Actions only)

```bash
npm run build:all
```
