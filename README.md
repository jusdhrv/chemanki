# ChemAnki

ChemAnki turns chemistry compound data into Anki flashcards. Search PubChem by compound name, SMILES, or formula, review the compound details, choose card types and included details, then download an Anki package.

Visit **[chemanki.vercel.app](https://chemanki.vercel.app)** to try it out!

## Current state

- Generates cards for **one compound at a time**.
- Downloads cards as an `.apkg` file, which you can import into Anki.
- Lets you choose card types and the details included on cards.
- Uses PubChem for compound data and structure images; an internet connection is required.
- Reads `NEXT_PUBLIC_ANKI_DECK_NAME` from `.env` for the target deck label shown in the app. **Currently, .apkg filename uses the compound name, but on importing the cards are populated in the target deck label instead**

## Planned improvements

- Add a queue to prepare and download cards for multiple compounds at once.
- Allow the deck name and other settings to be configured in the frontend.

## Run locally

You'll need Node.js 20.9 or later and pnpm.

```bash
git clone https://github.com/jusdhrv/chemanki.git
cd chemanki
pnpm install
cp .env.example .env
```

To change the target deck label shown in the app, edit `.env` in the same format as shown in `.env.example`:

```dotenv
NEXT_PUBLIC_ANKI_DECK_NAME=Organic Chemistry
```

Restart the development server after changing the value. This is a public, build-time setting, not a place for secrets.

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). To create and run a production build:

```bash
pnpm build
pnpm start
```

For a hosted deployment, set `NEXT_PUBLIC_ANKI_DECK_NAME` in the hosting provider's build environment and rebuild. The app does not require API keys for PubChem.

## Project structure

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Search, compound details, card selection, and `.apkg` download UI |
| `app/api/pubchem/` | Server routes for PubChem compound lookups and structure images |
| `app/api/anki/sql-wasm/` | Serves the WebAssembly asset used to build Anki packages |
| `lib/pubchem.ts` | PubChem requests and compound data handling |
| `lib/anki.ts` | Card generation and Anki package export |
| `components/ui/` | Shared UI components |
| `public/` | App icons and static assets |

## Developing

The main UI is in `app/page.tsx`; reusable compound lookup and card/package logic lives in `lib/`. The API routes in `app/api/` keep PubChem requests and the package export's WebAssembly asset available to the app. Run `pnpm dev` while making changes, and use `pnpm build` to check a production build.
