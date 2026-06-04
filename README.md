# WM-Tippspiel für eine Schulklasse

Eine einfache statische Web-App für ein WM-Tippspiel mit ca. 20 Kindern. Die Lehrerin kann Namen, Spiele, Ergebnisse und Tipps zentral im Browser eintragen.

## Funktionen

- Namen manuell eintragen, auch mehrere Namen auf einmal per Zeilenumbruch, Komma oder Semikolon.
- Spiele mit optionalem echtem Ergebnis anlegen.
- Pro Kind Tipps für alle Spiele erfassen.
- Rangliste mit automatischer Punkteberechnung.
- Daten im Browser speichern, als JSON exportieren und später wieder importieren.

## Punkte-Regeln

- **3 Punkte** für das exakte Ergebnis.
- **2 Punkte** für die richtige Tordifferenz.
- **1 Punkt** für die richtige Tendenz (Sieg, Unentschieden oder Niederlage).

## Starten

Die App benötigt keine Installation. Es reicht, die Datei `index.html` im Browser zu öffnen.

Für einen lokalen Testserver kann alternativ Folgendes genutzt werden:

```bash
python3 -m http.server 8000
```

Danach ist die App unter <http://localhost:8000> erreichbar.
