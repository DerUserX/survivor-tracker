# Survivor Tracker

Persönliches Survivor-(US)-Dashboard: gesehene Folgen abhaken, spoilerfreier Spielstand bis Ende der Folge
(Tribes, Ausgeschiedene, Votes, Idols/Vorteile, Challenges, Jury), Folgen 1–10 bewerten mit Text, Rankings.

## Starten

```bash
npm install
npm run dev
```

## Daten aktualisieren

Die Spieldaten kommen aus dem offenen [survivoR-Datensatz](https://github.com/doehm/survivoR),
Bilder aus dem Survivor Wiki (Fandom). Neue Folgen/Staffeln holen:

```bash
npm run data:refresh
```

## Speicherung

Bewertungen, Fortschritt und Rankings liegen im `localStorage` des Browsers.
Über das Zahnrad-Menü oben rechts kannst du sie als JSON exportieren/importieren (Backup).
