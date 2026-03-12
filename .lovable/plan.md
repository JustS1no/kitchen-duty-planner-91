

# Prompt für ein neues Lovable-Projekt: Moderations- & Protokollplanung

Hier ist ein fertiger Copy-Paste-Prompt, den du in einem neuen Lovable-Projekt verwenden kannst:

---

**Prompt:**

```
Erstelle eine deutschsprachige Single-Page-App zur Planung von Moderation und Protokollführung für wiederkehrende Meetings. Die App verwendet React, TypeScript, Tailwind CSS und shadcn/ui-Komponenten. Alle Texte sind auf Deutsch. Daten werden per useLocalStorage-Hook (JSON in localStorage) persistiert. Die App hat optional eine Electron-Desktop-Variante mit Outlook-COM-Integration (winax) für Meeting-Einladungen.

## Konzept

Es gibt zwei Rollen pro Termin: **Moderation** und **Protokoll**. Jeder Termin hat genau eine Person für Moderation und eine für Protokoll. Die Zuweisung erfolgt nach fairem Rotationsprinzip (wer am längsten nicht dran war, kommt zuerst).

## Datenmodell

### Mitarbeiter (Employee)
- id: string (UUID)
- name: string
- email: string | null
- active: boolean
- lastModerationDate: string | null (ISO-Datum)
- lastProtocolDate: string | null (ISO-Datum)

### Terminzuweisung (AssignmentEntry)
- id: string (UUID)
- date: string (ISO-Datum)
- weekday: string (deutscher Wochentag)
- moderatorId: string | null
- moderatorName: string
- protocolId: string | null
- protocolName: string
- isLocked: boolean

### LogEntry
- id, date, moderatorName, protocolName, plannedAt (ISO datetime)

## Planungsmodi

Beim Klick auf "Neue Planung" öffnet sich ein Dialog mit zwei Modi:

### Modus 1: Regelmäßig (alle 2 Wochen)
- Startdatum wählen (Standard: nächster Montag)
- Wochentag wählen (an welchem Tag findet das Meeting statt, z.B. Dienstag)
- Anzahl Termine: bis zu 10 in die Zukunft
- Termine werden alle 14 Tage ab Startdatum generiert

### Modus 2: Individuell
- Beliebige Einzeldaten manuell eingeben (Datumsfeld + Hinzufügen-Button)
- Liste der gewählten Daten mit Löschmöglichkeit

In beiden Modi wird nach Bestätigung ein Plan generiert, der für jeden Termin automatisch Moderation und Protokoll zuweist (Rotation nach "am längsten nicht dran").

## UI-Struktur (3 Tabs)

### Tab 1: Planung
- Header mit Icon und Titel "Moderations- & Protokollplanung"
- Button "Neue Planung" oben rechts
- Wenn kein Plan aktiv: Platzhalter mit Hinweis
- Wenn Plan aktiv: Tabelle mit Spalten: Checkbox, Datum, Wochentag, Moderation (Select-Dropdown), Protokoll (Select-Dropdown), Status (Lock-Icon)
- Aktionsleiste über der Tabelle: Fixieren, Freigeben, Neu würfeln, Export (.ics), Outlook (Desktop), Per Mail senden, Abbrechen, Bestätigen
- "Neu würfeln" mischt nur nicht-fixierte Einträge neu
- Moderation und Protokoll dürfen nicht dieselbe Person sein (Validierung)

### Tab 2: Mitarbeitende
- Tabelle: Name, E-Mail, Letzte Moderation, Letztes Protokoll, Aktiv-Toggle, Löschen
- Formular oben zum Hinzufügen neuer Mitarbeiter (Name, E-Mail, Letzte Moderation TT.MM.JJJJ, Letztes Protokoll TT.MM.JJJJ)

### Tab 3: Log
- Chronologische Liste aller bestätigten Planungen mit Datum, Moderator, Protokollant, Zeitstempel

## Organizer-Gate (Startbildschirm)

Beim ersten Öffnen: Dialog zur Auswahl des aktuellen Benutzers (Organisator) aus vorhandenen Mitarbeitern oder Neuanlage. Wird in localStorage gespeichert.

## Export & Kalender

### ICS-Export
- Button "Export (.ics)": Erzeugt ICS-Datei mit allen Terminen. Subject enthält Rolle, z.B. "Moderation - Max Mustermann" oder "Protokoll - Erika Muster".

### Per Mail senden (Dialog)
- Pro Mitarbeiter eine Zeile mit Name, E-Mail, zugewiesene Termine (mit Rollenangabe)
- Button öffnet mailto-Link und lädt ICS-Datei herunter

### Outlook Desktop (Dialog) – nur Electron + Windows
- Pro Mitarbeiter eine Zeile mit Sende-Button
- Sendet echte Meeting-Einladungen über Outlook COM/OOM (winax)
- Subject: "Moderation" oder "Protokoll" je nach Rolle
- Body: "Du bist als [Rolle] am [Wochentag], [Datum] eingeteilt."
- AllDayEvent = true
- MeetingStatus = 1 (olMeeting), Recipients.Add(email), Send()
- Fallback: ICS-Download wenn nicht Windows

## Technische Details

- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn/ui (Button, Card, Table, Dialog, Select, Checkbox, Switch, Tabs, Badge, ScrollArea, Input, Label, Toast)
- useLocalStorage-Hook für Persistenz
- date-fns für Datumsformatierung (deutsches Locale)
- Electron-Integration optional (electron/main.cjs, electron/preload.cjs, electron-builder.json)
- Farbschema: Primary für aktive Elemente, "locked" Farbe für fixierte Einträge

## Wichtige Regeln

- Dieselbe Person darf nicht gleichzeitig Moderation UND Protokoll am selben Termin haben
- Rotation getrennt nach Rolle: lastModerationDate und lastProtocolDate werden unabhängig verwaltet
- Deutsche UI durchgehend (Buttons, Labels, Fehlermeldungen, Toasts)
- Responsive Design (funktioniert auf Desktop und Tablet)
- Kein Backend nötig, alles läuft clientseitig mit localStorage
```

---

Dieser Prompt bildet die gesamte Architektur deiner aktuellen Küchendienst-App ab, angepasst auf zwei Rollen (Moderation/Protokoll) mit den zwei Planungsmodi (14-tägig bis 10 Termine oder individuell).

