package com.mealflow.appapi.shoppingLists.service;

import com.mealflow.appapi.shoppingLists.domain.ShoppingItemCategory;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * Keyword lookup that maps a grocery item name to its aisle. Deterministic, instant and free, so
 * manually added items land in the right section without a round-trip. Unknown names return empty
 * and are handed to {@link LlmItemCategorizer} in batch (or fall back to OTHER).
 *
 * <p>Keywords are matched as substrings, longest first — that way "mjölk" wins over "mjöl" and
 * "kycklingfilé" over "filé", instead of the shorter word hijacking the match.
 */
@Service
public class ShoppingItemCategorizer {

    private static final Map<String, ShoppingItemCategory> KEYWORDS = buildKeywords();
    private static final List<String> KEYWORDS_LONGEST_FIRST = KEYWORDS.keySet().stream()
            .sorted(Comparator.comparingInt(String::length).reversed())
            .toList();

    public Optional<ShoppingItemCategory> categorize(String name) {
        if (name == null || name.isBlank()) {
            return Optional.empty();
        }
        String normalized = name.trim().toLowerCase(Locale.ROOT);
        for (String keyword : KEYWORDS_LONGEST_FIRST) {
            if (normalized.contains(keyword)) {
                return Optional.of(KEYWORDS.get(keyword));
            }
        }
        return Optional.empty();
    }

    private static Map<String, ShoppingItemCategory> buildKeywords() {
        Map<String, ShoppingItemCategory> map = new LinkedHashMap<>();

        put(
                map,
                ShoppingItemCategory.PRODUCE,
                "lök",
                "vitlök",
                "purjolök",
                "salladslök",
                "rödlök",
                "schalottenlök",
                "potatis",
                "sötpotatis",
                "morot",
                "morötter",
                "tomat",
                "körsbärstomat",
                "gurka",
                "paprika",
                "sallad",
                "ruccola",
                "spenat",
                "broccoli",
                "blomkål",
                "vitkål",
                "grönkål",
                "zucchini",
                "squash",
                "aubergine",
                "svamp",
                "champinjon",
                "majs",
                "ärta",
                "ärtor",
                "haricot",
                "sparris",
                "selleri",
                "palsternacka",
                "rödbeta",
                "kålrot",
                "rättika",
                "fänkål",
                "citron",
                "lime",
                "apelsin",
                "äpple",
                "päron",
                "banan",
                "avokado",
                "mango",
                "ananas",
                "jordgubb",
                "blåbär",
                "hallon",
                "vindruv",
                "melon",
                "ingefära",
                "chili",
                "persilja",
                "basilika",
                "koriander",
                "dill",
                "gräslök",
                "timjan",
                "rosmarin",
                "mynta",
                "salvia",
                "onion",
                "garlic",
                "potato",
                "carrot",
                "tomato",
                "cucumber",
                "pepper bell",
                "lettuce",
                "spinach",
                "mushroom",
                "lemon",
                "apple",
                "banana",
                "avocado",
                "ginger");

        put(
                map,
                ShoppingItemCategory.MEAT,
                "nötfärs",
                "köttfärs",
                "fläskfärs",
                "blandfärs",
                "lammfärs",
                "kycklingfärs",
                "kyckling",
                "kycklingfilé",
                "kycklinglår",
                "kycklingbröst",
                "biff",
                "entrecote",
                "ryggbiff",
                "oxfilé",
                "fläskkotlett",
                "fläskfilé",
                "karré",
                "revben",
                "lamm",
                "kalkon",
                "bacon",
                "korv",
                "chorizo",
                "salami",
                "skinka",
                "prosciutto",
                "pancetta",
                "leverpastej",
                "kött",
                "chicken",
                "beef",
                "pork",
                "mince",
                "ground beef",
                "sausage",
                "ham",
                "turkey",
                "lamb",
                "lax",
                "torsk",
                "sej",
                "kolja",
                "räkor",
                "räka",
                "tonfisk",
                "sill",
                "makrill",
                "musslor",
                "kräftor",
                "skaldjur",
                "fisk",
                "ansjovis",
                "surimi",
                "salmon",
                "cod",
                "shrimp",
                "prawn",
                "tuna",
                "fish");

        put(
                map,
                ShoppingItemCategory.DAIRY,
                "mjölk",
                "havremjölk",
                "grädde",
                "vispgrädde",
                "matlagningsgrädde",
                "crème fraiche",
                "creme fraiche",
                "gräddfil",
                "smör",
                "margarin",
                "ost",
                "riven ost",
                "parmesan",
                "mozzarella",
                "fetaost",
                "halloumi",
                "keso",
                "kvarg",
                "yoghurt",
                "yoghurt naturell",
                "filmjölk",
                "färskost",
                "cheddar",
                "brie",
                "ägg",
                "milk",
                "cream",
                "butter",
                "cheese",
                "yogurt",
                "egg");

        put(
                map,
                ShoppingItemCategory.BREAD,
                "bröd",
                "tortilla",
                "tortillabröd",
                "pitabröd",
                "hamburgerbröd",
                "korvbröd",
                "baguette",
                "knäckebröd",
                "naan",
                "toast",
                "frallor",
                "bulle",
                "wrap",
                "bread");

        put(
                map,
                ShoppingItemCategory.PANTRY,
                "mjöl",
                "vetemjöl",
                "socker",
                "farinsocker",
                "vaniljsocker",
                "salt",
                "peppar",
                "svartpeppar",
                "olja",
                "olivolja",
                "rapsolja",
                "vinäger",
                "balsamico",
                "ris",
                "jasminris",
                "basmatiris",
                "pasta",
                "spaghetti",
                "makaroner",
                "penne",
                "tagliatelle",
                "lasagneplattor",
                "nudlar",
                "couscous",
                "bulgur",
                "quinoa",
                "linser",
                "kikärtor",
                "bönor",
                "krossade tomater",
                "passerade tomater",
                "tomatpuré",
                "buljong",
                "buljongtärning",
                "fond",
                "kokosmjölk",
                "soja",
                "sojasås",
                "fisksås",
                "sweet chili",
                "senap",
                "ketchup",
                "majonnäs",
                "honung",
                "sirap",
                "bakpulver",
                "bikarbonat",
                "jäst",
                "kanel",
                "spiskummin",
                "paprikapulver",
                "curry",
                "oregano",
                "chiliflakes",
                "kryddor",
                "tacokrydda",
                "taco",
                "havregryn",
                "müsli",
                "cornflakes",
                "nötter",
                "mandel",
                "cashew",
                "russin",
                "choklad",
                "kakao",
                "sylt",
                "flour",
                "sugar",
                "oil",
                "rice",
                "noodle",
                "stock",
                "soy sauce",
                "honey",
                "spice");

        put(map, ShoppingItemCategory.FROZEN, "fryst", "frysta", "djupfryst", "glass", "frozen", "ice cream");

        put(
                map,
                ShoppingItemCategory.DRINKS,
                "vatten",
                "mineralvatten",
                "juice",
                "läsk",
                "saft",
                "öl",
                "vin",
                "rödvin",
                "vitvin",
                "cider",
                "kaffe",
                "te ",
                "water",
                "juice",
                "beer",
                "wine",
                "coffee");

        return map;
    }

    private static void put(Map<String, ShoppingItemCategory> map, ShoppingItemCategory category, String... keywords) {
        List<String> all = new ArrayList<>(List.of(keywords));
        for (String keyword : all) {
            map.putIfAbsent(keyword, category);
        }
    }
}
