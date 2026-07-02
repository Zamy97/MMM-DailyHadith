# Hadith data (pre-built)

This folder contains the **pre-built** hadith database used by the module at runtime.

| File | Purpose |
|------|---------|
| `hadiths.json` | Main database (~7.6 MB, 5,473 hadiths) — **committed to GitHub** |
| `build-info.json` | When/how the data was built |

## For mirror users (Pi)

**Do not run `npm run build:data` on the Pi.** Just clone or pull — the data is already here.

```bash
git pull --ff-only
```

If git complains about local changes to `hadiths.json`:

```bash
git restore data/hadiths.json build-info.json
git pull --ff-only
```

## For maintainers (rebuild on your computer)

```bash
npm run build:data
git add data/hadiths.json data/build-info.json
git commit -m "Rebuild hadith data"
git push
```

Or trigger the **Build Hadith Data** GitHub Action (Actions tab → Run workflow).
