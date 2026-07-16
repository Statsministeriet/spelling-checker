# Mac App Store release-guide (Electron)

Denne guide er til distribution via Mac App Store (MAS) for dette projekt.

App-navn: `Antons AI Toolkit`.

## 1. Forbered i Apple Developer

1. Opret App ID: `com.anton.aitoolkit`.
2. Opret appen i App Store Connect med samme Bundle ID.
3. Hav både et app-signing certifikat og et installer-signing certifikat tilgængelige i din keychain.
	- For electron-builder skal distributionsbuilden kunne finde en `3rd Party Mac Developer Installer` identity til at signe `.pkg`.
	- Xcode/Apple Developer kan typisk oprette og installere certifikaterne automatisk.
4. Opret en provisioning profile til Mac App Store distribution for appens Bundle ID.
5. Download provisioning profile til Mac App Store distribution.

## 2. Installer certifikater lokalt

1. Importer certifikatet i Keychain Access (login keychain).
2. Sørg for at certifikatet vises med privat nøgle.
3. Kør eventuelt:

```bash
security find-identity -v -p codesigning
```

Du skal kunne se en passende app-signing identity og en installer-signing identity, før distributionsbuilden kan laves.

## 3. Byg lokalt

Udviklingsbuild (til hurtig test med sandbox):

```bash
export MAS_DEV_PROVISIONING_PROFILE="/Users/antonjensen/Downloads/Development_comantonaitoolkit.provisionprofile"
npm run dist:mas-dev
```

Distributionsbuild til App Store:

```bash
export MAS_PROVISIONING_PROFILE="/Users/antonjensen/Downloads/Prod_Antons_Ai_Toolkit.provisionprofile"
npm run dist:mas
```

Output ligger i `dist/` (typisk en `.pkg` til MAS).

Hvis distributionsbuilden stopper med en fejl om manglende `3rd Party Mac Developer Installer`, skal du hente/aktivere det certifikat i Apple Developer eller via Xcode.

## 4. Upload til App Store Connect

Brug Transporter-appen fra Apple eller Xcode Organizer til upload af `.pkg`.

Efter upload:

1. Udfyld metadata, screenshots og privacy-information i App Store Connect.
2. Vent på processing.
3. Opret release og send til review.

## 5. Vigtigt for dette projekt

Appen bruger AppleScript (`System Events`) til copy/paste i andre apps og globale genveje.
Det kan give App Review-risiko under sandbox-reglerne.

Før første submission bør du teste grundigt i en `mas-dev` build:

1. Genveje (Cmd+Shift+G / Cmd+Shift+F).
2. Kopi/indsæt på tværs af apps.
3. Accessibility/Automation tilladelser.

Hvis noget fejler i sandbox, kan funktionerne kræve redesign for App Store-godkendelse.
