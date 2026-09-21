# Locatie-autocomplete

Een Angular-component waarmee een gebruiker een locatie kan zoeken via een externe API.

## Api

## Input

De api heeft een get om de opdracht uit te voeren. De volgende parameters kunnen meegegeven worden:

- types
- key
- query
- maxresult (aantal terug te geven resultaten)
  
zie hieronder voor een beschrijving van het gedrag van deze parameters.

### Output

Er komt altijd een LocatieModel terug. Daar zitten de volgende velden in:

- key, de sleutel die bij het item hoort, altijd gevuld
- plaats
- straat
- omschrijving

## Types

De autocomplete kan zoeken op de volgende types:

- Adressen (adres)
- Plaatsen (plaats)
- Bedrijfslocaties (loc)
- Stations (station)
- Recente locaties van de gebruiker (recent)

De types locaties worden doorgegeven aan de api via de parameter types. Bv types=adres,plaats,recent. Als types leeg is dan wordt op alle types gezocht in de api.

## Key

In dit veld kan worden aangeven welk veld terug moet komen als sleutel. Dit kan zijn postcode, stationscode of plaats. De api filtert op basis van deze api wat er gevonden is wat een sleutel heeft.

## Gedrag

### Eerste klik

- De dropdown opent en toont de melding "Locaties worden geladen".
- De API wordt geraadpleegd zonder query gegevens
- Zijn er geen zoekargumenten, dan wordt de lijst met recente locaties getoond, of de melding "Geen locaties gevonden".

### Zoeken

- Als de gebruiker begint met type dan wordt na een debounce met de API gezocht en komen de resultaten terug.
- Klikt de gebruiker op een locatie, dan wordt die geselecteerd en wordt de bijbehorende waarde (bijvoorbeeld de postcode) in de autocomplete getoond.
- Als er meedere resultaten zijn kan de gebruiker met de cursor toesten door de resultaten lopen
- Als een resultaat geslecteerd is kan er met enter een selectie gedaan worden.
- Als een rij gekozen is dan sluit de autocomplete en wordt de waarde van het veld key getoond in het veld

#### Enter

- Is er een actieve rij (gekozen met de pijltjestoetsen), dan selecteert Enter die rij.
- Is er geen actieve rij en staat er tekst in het veld, dan selecteert Enter het eerste resultaat uit de lijst. Dit geldt voor elke key (postcode, stationscode en plaats), ook als er meerdere resultaten zijn.
- Loopt er nog een zoekopdracht (de debounce of de api-call), dan wacht de autocomplete: de debounce wordt overgeslagen zodat er meteen gezocht wordt, en zodra de resultaten binnen zijn wordt het eerste resultaat geselecteerd.
- Zijn er geen resultaten of gaat de api-call fout, dan gebeurt er niets en blijft de getypte tekst staan.
- Verder typen, Escape, het veld verlaten of op een rij klikken annuleert een Enter die nog op resultaten wacht.
- Is het veld leeg (er is alleen de lijst met recente locaties), dan selecteert Enter niets.
- Onder het veld wil ik graag een korte omschrijving van het gekozen item. Bv Utrecht centaal of Science park.

### Scrolling

- Als de gebruiker met de cursor omhoog en omlaag toetsen door de lijst loopt dan scrollt de lijst automatische mee.

### Opnieuw laden

- Als een gebruiker terug komt op het scherm en de autocomplete moet geladen worden dan wordt er gezocht in de api op de key met maxresults = 1.
- Het resultaat wat uit de api komt wordt als selected item gezet.
