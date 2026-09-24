using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace Locaties;

public enum LocatieType { Adres, Bedrijfslocatie, Station, Vliegveld }

public record LocatieItem(
    string? Postcode,
    string? Straatnaam,
    string? Huisnummer,
    string? Plaats,
    string? PoiOmschrijving,
    LocatieType Type);

public sealed record GerankteLocatie(LocatieItem Item, double Score);

/// <summary>Normaliseert tekst: lowercase, zonder accenten, leestekens -> spatie.</summary>
public static class Tekst
{
    private static readonly Regex Spaties = new(@"\s+", RegexOptions.Compiled);

    public static string Normaliseer(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return string.Empty;

        var decomposed = s.ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(decomposed.Length);
        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue; // é -> e
            sb.Append(char.IsLetterOrDigit(c) ? c : ' ');                                       // nac-stadion -> nac stadion
        }
        return Spaties.Replace(sb.ToString(), " ").Trim();
    }

    public static string[] SplitsWoorden(string genormaliseerd) =>
        genormaliseerd.Split(' ', StringSplitOptions.RemoveEmptyEntries);

    /// <summary>Komt 'groep' als hele woorden voor in 'tekst'? ("teststraat breda" bevat "breda")</summary>
    public static bool BevatWoordgroep(string tekst, string groep) =>
        groep.Length > 0 && $" {tekst} ".Contains($" {groep} ", StringComparison.Ordinal);

    public static int Levenshtein(string a, string b)
    {
        var d = new int[b.Length + 1];
        for (var j = 0; j <= b.Length; j++) d[j] = j;
        for (var i = 1; i <= a.Length; i++)
        {
            var vorige = d[0];
            d[0] = i;
            for (var j = 1; j <= b.Length; j++)
            {
                var tmp = d[j];
                d[j] = Math.Min(Math.Min(d[j] + 1, d[j - 1] + 1), vorige + (a[i - 1] == b[j - 1] ? 0 : 1));
                vorige = tmp;
            }
        }
        return d[b.Length];
    }
}

/// <summary>Ontleedt de zoekinvoer één keer, zodat elk resultaat er snel tegen gescoord kan worden.</summary>
public sealed class ZoekQuery
{
    private static readonly Regex PostcodeRegex = new(@"\b(\d{4})\s?([a-z]{2})\b", RegexOptions.Compiled);
    private static readonly Regex PostcodeCijfersRegex = new(@"^\d{4}$", RegexOptions.Compiled);
    private static readonly Regex HuisnummerRegex = new(@"\b(\d{1,5})([a-z]{0,2})\b", RegexOptions.Compiled);

    public string Genormaliseerd { get; }        // "teststraat 10 breda"
    public string? Postcode { get; }             // "4811ab"
    public string? PostcodeCijfers { get; }      // "4811" (alleen cijfers getypt)
    public string? Huisnummer { get; }           // "10" of "10a"
    public string TekstZonderNummers { get; }    // "teststraat breda"
    public IReadOnlyList<string> Woorden { get; }

    public ZoekQuery(string invoer)
    {
        Genormaliseerd = Tekst.Normaliseer(invoer);
        var rest = Genormaliseerd;

        var pc = PostcodeRegex.Match(rest);
        if (pc.Success)
        {
            Postcode = pc.Groups[1].Value + pc.Groups[2].Value;
            rest = rest.Remove(pc.Index, pc.Length);
        }
        else if (PostcodeCijfersRegex.IsMatch(rest))
        {
            PostcodeCijfers = rest;
            rest = string.Empty;
        }

        var hn = HuisnummerRegex.Match(rest);
        if (hn.Success)
        {
            Huisnummer = hn.Groups[1].Value + hn.Groups[2].Value;
            rest = rest.Remove(hn.Index, hn.Length);
        }

        TekstZonderNummers = Tekst.Normaliseer(rest);
        Woorden = Tekst.SplitsWoorden(TekstZonderNummers);
    }
}

public sealed class LocatieRanker
{
    // Gewichten centraal, zodat je ze makkelijk kunt tunen (of uit config halen).
    private const double PostcodeExact = 500, PostcodeZelfdeCijfers = 100, PostcodeAlleenCijfers = 300;
    private const double StraatInQuery = 200, PlaatsInQuery = 100;
    private const double PostcodePlusHuisnr = 1000, PostcodePlusHuisnrDeels = 600;
    private const double StraatHuisnrPlaats = 900, StraatHuisnr = 600, StraatHuisnrDeels = 300;
    private const double PoiExact = 800, PoiBevatQuery = 500, PoiBegintMetQuery = 450;
    private const double WoorddekkingAlgemeen = 150, WoorddekkingPoi = 150;
    private const double TypeHintBonus = 75;

    private static readonly Dictionary<LocatieType, string[]> TypeTrefwoorden = new()
    {
        [LocatieType.Station] = new[] { "station", "cs", "ns", "treinstation" },
        [LocatieType.Vliegveld] = new[] { "vliegveld", "luchthaven", "airport" },
    };

    public IReadOnlyList<GerankteLocatie> Rank(IEnumerable<LocatieItem> items, string zoekstring)
    {
        var q = new ZoekQuery(zoekstring);

        return items
            .Select(i => new GerankteLocatie(i, Score(i, q)))
            .OrderByDescending(r => r.Score)
            .ThenBy(r => (int)r.Item.Type)          // tiebreak: adres eerst
            .ThenBy(r => r.Item.Plaats)
            .ThenBy(r => r.Item.Straatnaam)
            .ToList();
    }

    private static double Score(LocatieItem item, ZoekQuery q)
    {
        var postcode = Tekst.Normaliseer(item.Postcode).Replace(" ", "");
        var straat = Tekst.Normaliseer(item.Straatnaam);
        var huisnr = Tekst.Normaliseer(item.Huisnummer).Replace(" ", "");
        var plaats = Tekst.Normaliseer(item.Plaats);
        var poi = Tekst.Normaliseer(item.PoiOmschrijving);

        double score = 0;

        // 1. Postcode
        var postcodeExact = q.Postcode != null && postcode == q.Postcode;
        if (postcodeExact) score += PostcodeExact;
        else if (q.Postcode != null && postcode.StartsWith(q.Postcode[..4])) score += PostcodeZelfdeCijfers;
        else if (q.PostcodeCijfers != null && postcode.StartsWith(q.PostcodeCijfers)) score += PostcodeAlleenCijfers;

        // 2. Huisnummer ("10" vs "10a" telt als deels)
        var huisnrExact = q.Huisnummer != null && huisnr == q.Huisnummer;
        var huisnrDeels = !huisnrExact && q.Huisnummer != null && huisnr.Length > 0
                          && LeidendeCijfers(huisnr) == LeidendeCijfers(q.Huisnummer);

        // 3. Straat en plaats als hele woordgroep in de zoekstring
        var straatMatch = Tekst.BevatWoordgroep(q.TekstZonderNummers, straat);
        var plaatsMatch = Tekst.BevatWoordgroep(q.TekstZonderNummers, plaats);
        if (straatMatch) score += StraatInQuery;
        if (plaatsMatch) score += PlaatsInQuery;

        // 4. Combinaties = exact adres
        if (postcodeExact && huisnrExact) score += PostcodePlusHuisnr;
        else if (postcodeExact && huisnrDeels) score += PostcodePlusHuisnrDeels;

        if (straatMatch && huisnrExact) score += plaatsMatch ? StraatHuisnrPlaats : StraatHuisnr;
        else if (straatMatch && huisnrDeels) score += StraatHuisnrDeels;

        // 5. POI-omschrijving
        if (poi.Length > 0 && q.Genormaliseerd.Length > 0)
        {
            if (poi == q.Genormaliseerd) score += PoiExact;
            else if (Tekst.BevatWoordgroep(poi, q.Genormaliseerd)) score += PoiBevatQuery;
            else if (poi.StartsWith(q.Genormaliseerd)) score += PoiBegintMetQuery; // "nac sta" terwijl je typt
        }

        // 6. Woorddekking: hoeveel zoekwoorden komen (ongeveer) terug in het item
        var alleWoorden = Tekst.SplitsWoorden($"{straat} {plaats} {poi}");
        score += Dekking(q.Woorden, alleWoorden) * WoorddekkingAlgemeen;
        score += Dekking(q.Woorden, Tekst.SplitsWoorden(poi)) * WoorddekkingPoi;

        // 7. Type-hint: "station breda" -> stations omhoog
        if (TypeTrefwoorden.TryGetValue(item.Type, out var trefwoorden) && q.Woorden.Any(w => trefwoorden.Contains(w)))
            score += TypeHintBonus;

        return score;
    }

    /// <summary>0..1: gemiddelde beste match per zoekwoord (exact, prefix of typefout).</summary>
    private static double Dekking(IReadOnlyList<string> zoekwoorden, string[] itemWoorden)
    {
        if (zoekwoorden.Count == 0 || itemWoorden.Length == 0) return 0;

        double totaal = 0;
        foreach (var z in zoekwoorden)
        {
            double beste = 0;
            foreach (var w in itemWoorden)
            {
                double s;
                if (w == z) s = 1.0;
                else if (z.Length >= 2 && w.StartsWith(z)) s = 0.8;   // prefix: "stad" -> "stadion"
                else if (z.Length >= 4 && Math.Abs(w.Length - z.Length) <= 2)
                {
                    var afstand = Tekst.Levenshtein(z, w);
                    s = afstand == 1 ? 0.6 : afstand == 2 && z.Length >= 7 ? 0.4 : 0;  // typefouten
                }
                else s = 0;

                if (s > beste) beste = s;
                if (beste == 1.0) break;
            }
            totaal += beste;
        }
        return totaal / zoekwoorden.Count;
    }

    private static string LeidendeCijfers(string s) => new(s.TakeWhile(char.IsDigit).ToArray());
}

/* Voorbeeld:

var items = await Task.WhenAll(bronA.ZoekAsync(q), bronB.ZoekAsync(q));
var ranker = new LocatieRanker();
var resultaat = ranker.Rank(items.SelectMany(x => x), q)
                      .Take(20)
                      .Select(r => r.Item);

"4811AB"               -> alles met postcode 4811AB bovenaan (daarna 4811xx)
"4811ab 10"            -> precies dat adres bovenaan
"teststraat 10 breda"  -> Teststraat 10, Breda bovenaan; 10a en andere nummers erna
"nac stadion"          -> item met die POI-omschrijving bovenaan
"station breda"        -> stations krijgen een extra duwtje
*/
