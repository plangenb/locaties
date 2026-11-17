# Codex + PowerShell: veilige bestandsbewerkingen

Dit pakket bevat een globale `AGENTS.md` voor Codex, gericht op Windows,
PowerShell 7, encoding en betrouwbaar wijzigen van bronbestanden.

## Inhoud

```text
codex-powershell-file-safety/
├── .codex/
│   └── AGENTS.md
├── scripts/
│   └── Install-GlobalAgents.ps1
└── README.md
```

## Installeren (aanbevolen)

1. Pak de ZIP uit.
2. Open PowerShell 7 (of de PowerShell-terminal in VS Code).
3. Ga naar de uitgepakte map.
4. Voer uit:

   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   .\scripts\Install-GlobalAgents.ps1
   ```

5. Het script installeert de instructies naar `$HOME\.codex\AGENTS.md`.
   Als daar al een bestand staat, maakt het script eerst een timestamp-back-up.
6. Sluit Codex volledig af en start een nieuwe Codex-sessie.

Codex leest de globale `AGENTS.md` uit zijn Codex-home directory automatisch.
Standaard is dat `$HOME\.codex`. Als je `CODEX_HOME` hebt ingesteld, gebruikt
Codex die map in plaats daarvan. Het installatiescript houdt daar rekening mee.

## Controleren

Voer in een nieuwe Codex-sessie bijvoorbeeld deze opdracht uit:

```text
Welke globale en projectgebonden AGENTS.md-instructies heb je geladen?
Vat de regels over PowerShell, encoding en bestandsbewerkingen samen.
```

Je kunt ook `/status` gebruiken om de actieve instructiebronnen te bekijken,
als jouw Codex-versie die informatie daar toont.

## PowerShell 7 controleren

```powershell
$PSVersionTable.PSVersion
```

De major version moet `7` zijn. Als je nog Windows PowerShell 5.1 gebruikt,
selecteer dan in VS Code de PowerShell 7-terminal (`pwsh`).

## Optioneel: console-encoding instellen

Dit is optioneel. Het beïnvloedt console-invoer/-uitvoer, maar garandeert niet
de encoding van elk bestand dat een programma schrijft.

Voer dit uit in PowerShell 7:

```powershell
$utf8 = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = $utf8
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8
```

Je kunt dit aan je PowerShell-profiel toevoegen als je dit blijvend wilt
instellen. Doe dit alleen als je dat zelf wilt; het installatiescript wijzigt
je PowerShell-profiel niet.

## Belangrijk

- Dit pakket wijzigt je bestaande `config.toml` niet.
- Voor globale Codex-instructies is `AGENTS.md` in de Codex-home directory
  voldoende; er is geen `model_instructions_file`-instelling nodig.
- Projectspecifieke `AGENTS.md`-bestanden kunnen aanvullende instructies geven.
- De instructies verkleinen de kans op quoting- en encodingfouten, maar kunnen
  model- of toolfouten niet volledig uitsluiten.
