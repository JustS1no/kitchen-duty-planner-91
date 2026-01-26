# Küchendienst-Planer

Eine Anwendung zur wochenweisen Planung von Küchendiensten.

## Web-Version

Die Web-Version läuft direkt im Browser und unterstützt:
- ICS-Download für manuelle Kalender-Importe
- mailto-Links zum E-Mail-Versand

## Desktop-App (Electron)

Die Desktop-App bietet zusätzlich:
- **Direktes Öffnen in Outlook** – Termine werden ohne Umweg in Outlook geöffnet
- Offline-Unterstützung
- Native Windows/Mac-Integration

### Desktop-App bauen

1. **Repository klonen und Abhängigkeiten installieren:**
   ```bash
   git clone <repo-url>
   cd kuechendienst-planer
   npm install
   ```

2. **Web-Assets bauen:**
   ```bash
   npm run build
   ```

3. **Electron-App starten (Entwicklung):**
   ```bash
   npm run electron:dev
   ```

4. **Installer erstellen:**
   ```bash
   # Windows
   npm run electron:build:win
   
   # Mac
   npm run electron:build:mac
   ```

Die fertigen Installer befinden sich im `release/`-Ordner.

### Systemanforderungen

- **Windows:** Windows 10 oder höher, Microsoft Outlook
- **Mac:** macOS 10.13 oder höher, Microsoft Outlook für Mac

## Funktionen

- Wochenplanung mit konfigurierbaren Tagen (Mo–Fr)
- Automatische Vorschläge basierend auf fairem Rotationsprinzip
- Fixieren von Zuweisungen
- Export als ICS-Kalenderdatei
- Direktes Eintragen in Outlook (nur Desktop-App)
- E-Mail-Versand mit ICS-Anhang

## Technologien

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Electron (Desktop-App)
