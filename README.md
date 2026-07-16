# Antons AI Toolkit

Lille menu-bar app til Mac der retter stavefejl og finpudser tekst, uanset hvilken app du står i. Bruger som udgangspunkt den gratis [LanguageTool](https://languagetool.org) API, men du kan i stedet tilslutte din egen sprogmodel (OpenAI, Anthropic eller Google) via [AI SDK](https://ai-sdk.dev).

## To funktioner

- **Ret stavefejl** - retter kun stave- og grammatikfejl. Formatering, tone og budskab ændres ikke. Dette er appens primære funktion.
- **Finpuds tekst** - rydder op i en rodet tekst, så den får en klar rød tråd, men beholder samme sprog og de samme udtryk og ord, som du selv har brugt. Kræver en AI-udbyder (virker ikke med gratis-udbyderen LanguageTool).

## Sådan virker det

Der er to måder at bruge appen på:

1. **Genvej på markeret tekst**: Marker tekst i en hvilken som helst app (Mail, Notes, browseren osv.).
   - **Cmd+Shift+G** retter stavefejl i den markerede tekst.
   - **Cmd+Shift+F** finpudser den markerede tekst.

   Appen viser et lille vindue med resultatet. Klik **"Accepter & indsæt"** - teksten indsættes automatisk der hvor du stod.
2. **Vindue i menu-baren**: Klik på ikonet i menu-baren for at åbne et lille vindue, hvor du selv kan skrive eller indsætte tekst. Brug knapperne **"Ret stavefejl"** / **"Finpuds tekst"** - klik på den lille pil ved siden af for i samme klik at få outputtet kopieret til udklipsholderen.

## Vælg sprogmodel-udbyder

Klik på tandhjulet i vinduet i menu-baren (eller "Indstillinger..." i højreklik-menuen) for at:

- Vælge udbyder: LanguageTool (gratis, kun stavefejl), OpenAI, Anthropic (Claude) eller Google (Gemini)
- Indsætte din egen API-nøgle til den valgte udbyder
- Vælge eller skrive hvilken model der skal bruges

API-nøgler gemmes lokalt på din computer (i appens indstillingsfil) og sendes kun til den udbyder, du selv har valgt.

## Første opsætning (gør det en gang)

Kræver [Node.js](https://nodejs.org) installeret (download LTS-udgaven hvis du ikke har den).

Åbn Terminal og kør:

```bash
cd sti/til/ai-vaerktoj
npm install
npm start
```

Første gang du trykker Cmd+Shift+G eller Cmd+Shift+F beder macOS om **Accessibility-tilladelse**:

- Gå til **Systemindstillinger > Privatliv & Sikkerhed > Tilgængelighed**
- Slå til for "Electron" (eller "Terminal", hvis du kører via `npm start`)
- Uden denne tilladelse kan appen ikke kopiere markeret tekst eller indsætte rettelser automatisk

## Lav en rigtig .app du kan åbne som alle andre programmer

```bash
npm run dist
```

Det bygger en `.dmg`-fil i `dist/`-mappen. Åbn den og træk appen til Programmer-mappen. Husk stadig at give **Antons AI Toolkit** Accessibility-tilladelse i Systemindstillinger.

## Mac App Store distribution

Projektet er nu sat op med første MAS-build scripts:

```bash
npm run dist:mas-dev
npm run dist:mas
```

Der er en fuld trin-for-trin guide i `APP_STORE.md` (certifikater, provisioning profile, build og upload).

## Sådan opdaterer du til en ny version

Appen har ingen automatisk opdatering - når du (eller Claude) laver ændringer i koden, skal du selv bygge og geninstallere:

1. Lav dine kodeændringer som normalt.
2. Bump versionsnummeret i `package.json`, fx:
   ```bash
   npm run version:patch   # 1.0.0 -> 1.0.1, til rettelser
   npm run version:minor   # 1.0.0 -> 1.1.0, til nye funktioner
   npm run version:major   # 1.0.0 -> 2.0.0, til store/brydende ændringer
   ```
3. Byg en ny `.dmg`:
   ```bash
   npm run dist
   ```
4. Åbn den nye `.dmg` i `dist/`-mappen og træk appen til Programmer-mappen igen - det overskriver den gamle installation.
5. Genstart appen (afslut via tray-menuen, åbn den igen fra Programmer).

Du kan altid tjekke hvilken version der kører ved at højreklikke på ikonet i menu-baren - versionsnummeret står øverst i menuen.

## Begrænsninger

- LanguageTool's gratis API har en grænse på ca. 20 kald/minut og ca. 20.000 tegn - fint til almindelig brug, men kan blive langsom ved meget hyppig brug
- Bruger du en AI-udbyder, sendes teksten til den udbyders server sammen med din API-nøgle - undgå at bruge det til meget følsomt indhold, og hold øje med dit forbrug hos udbyderen
- Finpudsning virker ikke med LanguageTool - vælg en AI-udbyder i Indstillinger for at bruge den funktion
- Genvejene Cmd+Shift+G / Cmd+Shift+F er hardkodet i `main.js` - ændr linjerne med `globalShortcut.register(...)` hvis de kolliderer med noget andet
- Virker kun på macOS (bruger AppleScript til at simulere Cmd+C / Cmd+V)

## Filer

- `main.js` - appens hovedlogik: tray-ikon, genveje, valg af udbyder, indsætning
- `store.js` - gemmer og henter indstillinger (udbyder, API-nøgler, model) lokalt
- `aiProvider.js` - kalder den valgte sprogmodel via [AI SDK](https://ai-sdk.dev)
- `popup.html` / `popup.js` - det lille vindue med resultatet fra genvejene
- `trayWindow.html` / `trayWindow.js` - vinduet der åbnes ved klik på menu-bar-ikonet
- `settings.html` / `settings.js` - indstillingsvinduet til udbyder/API-nøgle/model
- `preload.js` - sikker bro mellem hovedproces og vinduer
