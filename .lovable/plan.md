

## Plan: Electron-Skripte zur package.json hinzufügen

### Das Problem
Die Electron-Skripte (`electron:dev`, `electron:build:win`, `electron:build:mac`) fehlen in der `package.json`. Deshalb funktioniert der Befehl `npm run electron:dev` nicht.

### Lösung
Ich werde die fehlenden Skripte zur `package.json` hinzufügen:

| Skript | Befehl | Beschreibung |
|--------|--------|--------------|
| `electron:dev` | `npm run build && electron electron/main.js` | Startet die App im Entwicklungsmodus |
| `electron:build:win` | `npm run build && electron-builder --win` | Erstellt Windows-Installer |
| `electron:build:mac` | `npm run build && electron-builder --mac` | Erstellt Mac-Installer |

### Nach der Änderung
Du kannst dann folgende Befehle nutzen:

```bash
# App im Entwicklungsmodus starten
npm run electron:dev

# Windows-Installer erstellen
npm run electron:build:win

# Mac-Installer erstellen  
npm run electron:build:mac
```

---

### Technische Details

Die `scripts`-Sektion in `package.json` wird erweitert von:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  ...
}
```

zu:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "electron:dev": "npm run build && electron electron/main.js",
  "electron:build:win": "npm run build && electron-builder --win",
  "electron:build:mac": "npm run build && electron-builder --mac",
  ...
}
```

