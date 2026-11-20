/* GONE Fishing field guide data.
   Fish + bait numbers: community catch-API snapshot published by gonefishingwiki.com (captured 2026-10-21; 410,550 catches).
   Everything else: official FAQ (gonefishing.gg/faq), gonefishingwiki.com, gonefishingwiki.vercel.app, Steam store page.
   Edit here, then run build.py to re-inline into the single-file guide. */

/* name | catches | avg lb | best lb | max value | maps (L Lake, S Swamp, J Jungle, C Canyon, A Arctic, T Tutorial) | tier c/m/l */
const FISH_RAW = `
Perch|28996|0.75|4.57|103|SLTAC|c
Blue Gill|28713|0.52|17.41|95|LTS|c
Redfin Pickeral|26976|1.34|10.17|147|LSTJ|c
Crappie|26232|1.29|18.21|117|LST|c
Red Horse Sucker|26011|1.24|15.98|103|LST|c
Shad|25969|2.05|50|117|LJST|c
White Bass|25729|2.42|13.51|132|LTS|c
Large Mouth Bass|16480|3.21|37.11|147|LST|c
Sockeye Salmon|16397|4.15|40.99|220|LATSJ|c
Walleye|15188|6.97|56.68|220|LSAT|c
Catfish|14777|3.30|98.09|191|LSTCAJ|c
Burbot|12526|5.42|40.96|117|ALT|c
Brown Trout|8067|9.92|125|249|LJAST|c
Giant Barb|7990|282.44|1729.65|264|LST|c
Blue Catfish|6033|25.92|307.36|235|LSATJC|c
Striped Bass|5903|22.90|150|293|LJST|c
Bowfin|5048|9.95|60.22|176|SLCT|c
Lungfish|4034|26.99|256.05|323|LT|c
Piranha|3896|2.10|48.25|103|SC|c
Bichir|3839|2.44|18.75|117|SC|c
Muskellunge|3163|174.58|1250|396|LSAC|c
Dragon Goby|3073|0.69|6.11|117|J|c
Silver Mono|3057|0.40|3|103|J|c
Redtail Catfish|2886|55.96|335.51|235|SLCATJ|c
Oscar Cichlid|2792|0.92|4.02|95|S|c
Goblin|2423|50|50|0|SJLCTA|c
Pink Salmon|2379|2.99|20.23|147|A|c
Humpback Whitefish|2302|4.42|35.49|132|A|c
Electric Eel|2255|38.11|196.86|293|SLCT|c
Snapping Turtle|2048|105.25|1234.62|293|STLCAJ|c
Puffer|1984|7.81|14.99|220|SLAJTC|c
Croaker|1973|3.05|19.90|117|J|c
Blue Tilapia|1851|2.38|37.50|132|J|c
Snake Head|1819|30.07|304.20|191|JSC|c
Peacock Bass|1577|6.17|39.85|176|SC|c
Lane Snapper|1535|2.59|15.09|132|J|c
Char|1432|8.73|54.08|220|A|c
Saurichthys|1258|14.84|138.75|220|CJ|c
Pacu|1203|37.16|304.75|279|SC|c
Lepidotes|1186|16.34|121.97|176|C|c
Cephalaspis|1145|4.23|12.50|132|C|c
Coelacanth|1123|218.21|1215.66|323|C|c
Red Drum|990|29.60|138.83|293|J|c
Sheepshead|964|15.75|59.77|235|J|c
Clown Knife|869|12.12|61.41|147|S|c
Acoupa Weakfish|833|8.66|39.98|147|S|c
Mangrove Snapper|769|20.89|101.62|279|J|c
Atlantic Salmon|767|25.02|229.40|367|A|c
Snook|723|16.24|99.99|367|J|c
Cod|714|90.65|619.63|440|A|c
Saddletail Grouper|713|76.40|500|293|AJ|c
Stethacanthus|704|8.02|101.66|220|CJ|c
Pollock|688|14.47|163.43|249|A|c
Ling|686|27.09|374.99|293|A|c
Haddock|600|11.20|71.17|220|A|c
Arm|588|9.45|13.99|293|SACLJT|c
Mullet|565|6.50|35.47|161|J|c
Leg|537|40.52|59.90|293|JLCAST|c
Eel|528|7.79|50.21|176|J|c
Flounder|504|10.73|111.38|125|SJC|c
Wolffish|310|23.65|197.56|264|A|c
Napoleon Wrasse|300|429.13|1992.23|440|J|c
Greater Amberjack|195|234.04|1500|367|J|c
Giant Trevally|190|177.17|1001.21|367|J|c
Opah|172|232.37|1823.98|323|J|c
Cobia|165|168.21|664.39|323|J|c
Spanish Mackerel|139|4.89|22.29|161|J|c
Red Perch|128|1.10|11.72|117|J|c
Coney Grouper|107|1.32|5.17|132|J|c
Coral Grouper|89|9.08|23.92|176|J|c
Angler|41|15.94|148.11|264|J|c
Wels Catfish|6245|432.53|4361.52|323|LASJCT|m
Sturgeon|3799|864.81|7423.13|660|SJLCA|m
Paddlefish|3714|86.38|2267.64|396|SLCT|m
Bull Shark|2965|918.22|6817.81|484|SJLC|m
Goblin Shark|2787|1064.04|7500|513|SLJCAT|m
Alligator Gar|2691|787.49|5000|484|JSCL|m
Shortfin Mako|2557|1773.64|9876.67|587|JLSC|m
Gold Fish|2137|8.59|14.99|807|LJTSCA|m
Giant Mekong Catfish|2110|531.90|4257.45|323|SLCAJT|m
Saw Fish|1829|1453.53|12350.83|616|LJCS|m
Arapaima|1410|2056.85|9965.28|660|CS|m
Helicoprion|1402|2628.28|14860.09|675|CJ|m
Nile Perch|1067|248.68|2263.88|513|L|m
Dog Tooth Tuna|970|566.21|5000|367|JL|m
Manatee|794|4062.62|30000|734|JSLA|m
Xiphactinus|699|4942.01|43750|880|LCS|m
Mermaid|678|139.63|149.98|977|LSCJA|m
Toothfish|640|249.01|1023.53|513|A|m
Great White Shark|638|2900.31|27112.55|807|JLS|m
Tarpon|632|1049.72|9375|528|J|m
Greenland Shark|489|2224.38|12500|587|A|m
Beluga|435|3464.14|23034.89|660|A|m
Narwhal|425|1380.30|8413.54|587|A|m
Sail Fish|389|441.53|5328.08|484|JSC|m
Mola Mola|287|4647.56|11823.28|954|J|m
Bottlenose Dolphin|281|546.11|3713.26|587|J|m
Goliath Grouper|222|1512.33|15072.96|528|J|m
Mahi Mahi|89|492.05|2500|396|J|m
Dunkleosteus|81|28487.69|132183.48|13028|C|l
Orca|60|24874.30|43366.13|13028|A|l
Lochness Monster|50|19875.38|46587.45|11399|L|l
Goliath Snapper|42|24612.10|105247.35|9771|S|l
Giant Squid|32|15939.51|81556.44|8142|J|l
Megalodon|15|84975.22|302070.47|14656|C|l
Stingray|14|11903.57|64946.48|9771|J|l
Sperm Whale|9|64700.11|188596.17|14656|J|l
Colossal Squid|8|81072.41|222723.69|14656|A|l
Dakosaur|6|35628.52|67819.76|11399|S|l
Rhizodus|6|49684.81|99270.02|14656|L|l
`;

const FISH_NOTES = {
  "Rhizodus": "1.0 Mythic in deep Lake water. Needs the Lake Entity beaten and the MOBY rod.",
  "Lochness Monster": "The Lake's Legendary (\"Nessie\"). Needs bait score 175+, deep water and a strong late-run setup.",
  "Goblin": "Joke catch: always 50 lb and worth 0 points. Don't count on it for quota.",
  "Gold Fish": "Tiny but worth up to 807. Turns up on every map; a quota saver.",
  "Mermaid": "Worth up to 977 but weighs only ~140–150 lb. Every map except the tutorial.",
  "Arm": "Body part. Found on every map; flat ~293 value.",
  "Leg": "Body part. Found on every map; flat ~293 value.",
  "Giant Barb": "Heavy (avg 282 lb) but low value for its size.",
  "Wels Catfish": "Very common big fish; weight carries it, value tops out at 323."
};

/* name | bait score | catches | species seen | maps it was used on */
const BAIT_RAW = `
Sleeping Troll Ragdoll|86|76|32|4
Spider Creature Ragdoll|85|131|33|5
Polar Bear Ragdoll|82|12|9|1
Snake Ragdoll|82|115|33|5
Stalker Ragdoll|82|202|41|5
Egg Creature Ragdoll|80|12|7|5
Moose|80|139|32|5
Ivan Ragdoll|80|1305|71|5
Baby Polar Bear|78|77|18|1
Penguin|72|540|44|5
Croc Ragdoll|70|217|40|4
Walrus|70|825|65|5
Human|70|3466|90|5
Chopped Bait XLarge|70|9931|97|5
Seal|68|461|27|1
Baby Penguin|68|1555|82|6
Komodo|65|133|22|1
Tapir|62|347|25|1
Baby Seal|62|2150|89|6
Gorilla|60|4131|95|6
Shoe Bill|59|792|48|2
Raccoon|58|3332|76|6
Desert Turtle|55|397|31|1
Chopped Bait Large|55|796|66|5
Puffin|55|2259|81|6
Capybara|51|1301|47|1
Rabbit|50|787|61|4
Ant Eater|50|2400|91|6
Armadillo|46|195|43|2
Croc Bait|46|2474|73|4
Bat|45|6|3|2
Cassowary|45|694|77|5
Beaver|45|2671|90|6
Turtle|42|8174|93|6
Duckling|40|4747|88|5
Chopped Bait Medium|40|6252|94|6
Desert Scorpion|39|1829|80|6
Rat|38|4241|89|6
Snake|38|4389|91|6
Squirrel|36|1822|90|6
Crab|35|7905|91|5
Scorpion|35|8093|93|5
Tarantula|33|2928|92|6
Iguana|30|2215|83|6
Leaf Tailed Gecko|30|4374|81|6
Spider|30|14526|93|6
Dart|28|494|33|1
Glizzy|28|7729|12|6
Minnow|28|17723|94|6
Egg|25|3138|25|1
Chopped Bait Small|25|12605|90|6
Bull Frog|24|24401|82|6
Lizard|21|10677|67|6
Ant|20|2406|36|2
Beetle|20|2863|74|6
Mouse|17|434|17|1
Cockroach|16|7808|39|3
Worm|15|120604|68|6
`;

const BAIT_NOTES = {
  "Sleeping Troll Ragdoll": "Highest bait value in the game (86, official FAQ). Trolls take 3 TNT and show up from day 2.",
  "Spider Creature Ragdoll": "Killed spider creature.",
  "Stalker Ragdoll": "Killed Stalker. Most-used top-tier ragdoll.",
  "Croc Ragdoll": "Killed crocodile (one TNT). Croc young also work as bait.",
  "Polar Bear Ragdoll": "Arctic only.",
  "Baby Polar Bear": "Arctic only.",
  "Seal": "Arctic only.",
  "Worm": "Outside the cabin on the Lake. Always available; the most-used bait by far.",
  "Cockroach": "Lake: by the gambling pool.",
  "Lizard": "Lake: around the altar and the trees to its left.",
  "Bull Frog": "Lake: on the island between cabins and around cabin walls.",
  "Spider": "Lake: inside the second cabin.",
  "Minnow": "Fish trap. Harvest it every morning (infinite since the 10-06 patch).",
  "Turtle": "Lake: two behind the cabin, reachable on foot.",
  "Duckling": "Lake: the pond on the left path.",
  "Scorpion": "Lake: the cave's left wall.",
  "Crab": "Lake: near the teleport portal.",
  "Rat": "Lake: past the pink mushroom.",
  "Cassowary": "Jungle bait.",
  "Capybara": "Jungle bait.",
  "Tapir": "Jungle bait.",
  "Komodo": "Single-map bait.",
  "Desert Turtle": "Single-map bait."
};

/* Bait tiers (gonefishingwiki.com grouping) */
const BAIT_TIERS = [
  {t:"T1", lo:15, hi:24, d:"Always available"},
  {t:"T2", lo:25, hi:40, d:"Common small game"},
  {t:"T3", lo:41, hi:59, d:"Mid game"},
  {t:"T4", lo:60, hi:72, d:"High value: big fish start biting (60+)"},
  {t:"T5", lo:73, hi:99, d:"Top end: ragdolls and large animals"}
];

const MAPS = [
 {id:"lake", code:"L", name:"Lake", color:"#3f86c4", unlock:"Start", species:44, depth:"Down to ~6,000",
  sig:["Lochness Monster","Rhizodus"],
  layout:["Altar: directly left of the starting cabin.",
          "Gambling pool: inside the large cave behind the altar.",
          "Two Turtles behind the cabin (reachable on foot): easy 42-score bait."],
  tips:["Learn the loop here. Worms are outside the cabin, frogs on the island between cabins, and lizards around the altar.",
        "Build the minnow trap early and empty it every morning for free bait.",
        "Docks reach ~500 depth and most fish. Go past 2,000 depth for much higher value once your line can take it.",
        "Rhizodus (Mythic) is in deep Lake water, but only after the boss is beaten and you hold the MOBY rod."],
  threats:["Troll (day 2+)","General night roster"],
  baits:"Worm, Cockroach, Lizard, Bull Frog, Spider, Minnow, Turtle, Duckling, Scorpion, Crab, Rat"},
 {id:"jungle", code:"J", name:"Jungle", color:"#2f9e5f", unlock:"Day 7", species:62, depth:"4,500+ spot",
  sig:["Sperm Whale","Stingray","Giant Squid"],
  layout:["Altar: in front of the cabin, slightly right.",
          "Gambling pool: across the water, ringed by bamboo.",
          "Only map where you can spawn a boat (Esc menu)."],
  tips:["Most species of any map (62), plus a lot of mid-value saltwater fish (Napoleon Wrasse, Opah, Amberjack, Mola Mola).",
        "Widest bait list: Cassowary, Capybara and Tapir only show up here.",
        "Has Mythics instead of a Legendary (official FAQ).",
        "Night is rough: Giant Spider and Frog Tribesmen. Be back at the cabin by dusk."],
  threats:["Giant Spider","Frog Tribesmen","Anaconda"],
  baits:"Cassowary, Capybara, Tapir and the common baits"},
 {id:"swamp", code:"S", name:"Swamp", color:"#7a8f2c", unlock:"Day 14", species:51, depth:"Narrow deep pockets",
  sig:["Dakosaur","Goliath Snapper"],
  layout:["Altar: in front of the cabin, reached by either of two reed passages.",
          "Gambling pool: in a rock gap to the north-east.",
          "Wide shallows with narrow deep pockets. Find the pockets for big fish."],
  tips:["Gator Alley is the map's signature hazard. Crocs grab: mash Space to break free.",
        "A killed croc (one TNT) is a 70-score ragdoll, and its young work as bait too.",
        "Piranha, Arapaima, Pacu and Peacock Bass live here and in the Canyon."],
  threats:["Crocodile / Gator Alley","Anaconda","Shark (wading)"],
  baits:"Croc Bait, Croc Ragdoll and the common baits"},
 {id:"canyon", code:"C", name:"Canyon", color:"#c56a33", unlock:"Not stated", species:40, depth:"4,500+ spot",
  sig:["Megalodon","Dunkleosteus"],
  layout:["Vertical map: cliffs and rope bridges.",
          "Gambling cave: reached by teleport.",
          "A Depth Finder is close to mandatory here."],
  tips:["Fossil fish: Helicoprion, Xiphactinus, Lepidotes, Cephalaspis, Saurichthys, Coelacanth.",
        "Megalodon ties for the highest max value in the game (14,656).",
        "Watch your footing on the bridges at night."],
  threats:["General night roster"],
  baits:"Common baits; Desert Scorpion"},
 {id:"arctic", code:"A", name:"Arctic", color:"#5aa8cf", unlock:"Not stated", species:37, depth:"4,500+ spot",
  sig:["Colossal Squid","Orca"],
  layout:["Night arrives earliest here.",
          "Snow: you MUST make quota that day or it's game over.",
          "Polar bait (Polar Bear, Seal, Walrus, Penguins) lives here."],
  tips:["Buy the Timeless Light totem before a serious Arctic run.",
        "Cod, Atlantic Salmon and Toothfish are solid value. Beluga, Narwhal and Greenland Shark are the mid-tier earners.",
        "Has Mythics instead of a Legendary (official FAQ).",
        "The Yeti spawns here (fixed in the 10-22 patch)."],
  threats:["Yeti","General night roster"],
  baits:"Polar Bear, Baby Polar Bear, Seal, Baby Seal, Walrus, Penguin, Baby Penguin, Puffin"},
 {id:"tutorial", code:"T", name:"Tutorial", color:"#8a8f98", unlock:"Start", species:null, depth:"Shallow",
  sig:[], layout:["Teaches the cast, hook and reel loop."], tips:["Shares most common Lake species."], threats:[], baits:"Basics"}
];

/* src: o = official FAQ / store, w = fan wiki, c = community report (unconfirmed) */
const THREATS = [
 {n:"Troll", map:"—", src:"o", tnt:"3 TNT", when:"From day 2 (was day 3 before 10-22)",
  how:"Big night monster. Takes three TNT.", tip:"Kill it if you can: its ragdoll is the best bait in the game (86)."},
 {n:"Crab Queen", map:"—", src:"o", tnt:"2 TNT", how:"Takes two TNT (official FAQ).", tip:"Have two TNT ready before you start it."},
 {n:"Stalker", map:"—", src:"w", tnt:"1 TNT", how:"Stalks players at night.", tip:"A placed torch slows it a lot. Stalker ragdoll = 82 bait."},
 {n:"Larry The Late Night Crab", map:"—", src:"o", tnt:"Immune", how:"Late-night crab.", tip:"Cannot be killed. Run or be in bed."},
 {n:"Flying NightTerrors", map:"—", src:"o", tnt:"Immune", how:"Flying night threat.", tip:"Cannot be killed. Get indoors."},
 {n:"Hallucinations", map:"—", src:"o", tnt:"Immune", how:"Fake threats, e.g. a Large Crab.", tip:"Cannot be killed. Don't waste TNT."},
 {n:"The HEV", map:"—", src:"o", tnt:"Immune", how:"Unkillable threat.", tip:"Run."},
 {n:"Jumping Shark", map:"Water", src:"o", tnt:"Immune", how:"Leaps out of the water.", tip:"Cannot be killed. Fish from shore or dock."},
 {n:"Crocodile", map:"Swamp", src:"c", tnt:"1 TNT", how:"Low growl, then stomping. Can grab you.", tip:"Mash Space to escape a grab. Corpse (70) and young are bait."},
 {n:"Big Fish Man", map:"All (night)", src:"c", tnt:"Immune (reported)", how:"Heavy footsteps from above. Faster than you; kills on contact.", tip:"Be asleep: make quota, wait for the blue flame, go to bed."},
 {n:"Yeti", map:"Arctic", src:"w", tnt:"?", how:"Arctic creature (spawning fixed 10-22).", tip:"Arctic nights come early; carry a light."},
 {n:"Giant Spider", map:"Jungle", src:"c", tnt:"?", how:"Roar at night, footsteps outside the jungle cabin.", tip:"Don't be out in the jungle after dusk."},
 {n:"Frog Tribesmen", map:"Jungle", src:"w", tnt:"?", how:"Jungle night creatures.", tip:"Stay near the cabin at night."},
 {n:"Anaconda", map:"Jungle / Swamp", src:"c", tnt:"?", how:"Hissing nearby; reported to coil around players.", tip:"Avoid dense water edges; move as a pair."},
 {n:"Shark (wading)", map:"Water", src:"c", tnt:"?", how:"Circles anglers standing in water, then lunges.", tip:"Don't wade. Fish from shore or a dock."},
 {n:"Shy One", map:"—", src:"c", tnt:"?", how:"Hides in grass or beside buildings; flees when spotted.", tip:"Spot it first. If it doesn't flee, leave."},
 {n:"Giant", map:"All (night)", src:"c", tnt:"1 TNT", how:"Low roar at night, heavy steps. Freezes while watched.", tip:"Look at it and back away. Its corpse is bait."},
 {n:"Puffer Boar", map:"Banling camp", src:"w", tnt:"?", how:"New 11-11. Territorial, trained by the Banling camp.", tip:"Great bait when killed."},
 {n:"Terrorist", map:"?", src:"w", tnt:"Killable", how:"Made killable in the 11-11 fix.", tip:""},
 {n:"Sharkman", map:"?", src:"w", tnt:"?", how:"Remade 09-26.", tip:""},
 {n:"Lake Entity", map:"Final boss", src:"o", tnt:"Boss fight", how:"The 1.0 final boss: a giant whale with an eyeball weak point, rolling turtles and a whale nuke.", tip:"See the Boss guide. Beating it unlocks the MOBY rod and Jeremy Wade difficulty."}
];

const TOTEMS = [
 {n:"Leviathan's Totem", rank:1, eff:"Multiplies bait score, fish weight and point value together.",
  lv:"Lv1 ×1.10 · Lv2 ×1.15 · Lv3 ×1.20 · Lv4 ×1.25", note:"The main lever for Legendaries. Team-wide."},
 {n:"Fish Frenzy", rank:2, eff:"Faster bites.", lv:"Max level: 75% faster bites, 250 gold (was 90% / 200 before 10-22)", note:"Even level 0 gives a small nudge."},
 {n:"Slowing Metabolism", rank:3, eff:"Lowers the quota.", lv:"Since 10-22 it lowers the quota continuously, not once on purchase.", note:"Great for long runs."},
 {n:"Timeless Light", rank:4, eff:"Keeps a light on at night.", lv:"", note:"Strongly recommended for the Arctic."},
 {n:"Midas Touch", rank:5, eff:"Passive gold on a timer.", lv:"", note:"Worth it after about day 20."}
];

const PERKS = [
 {n:"Sticky Hook", tier:"S", eff:"More time in the red before the line snaps: 3 s (was 1.25 s).", note:"Best first pick, solo or co-op."},
 {n:"Fish Whisperer", tier:"A", eff:"+5% point value and weight, applied when you catch.", note:"Best second pick."},
 {n:"Midas Touch", tier:"A", eff:"3 gold every 2 minutes (shared gold).", note:"Support pick in co-op. (gonefishingwiki.com lists Midas Touch as a totem instead; sources disagree.)"},
 {n:"Bait Carepackage", tier:"B", eff:"Spawns extra bait in the cabin on load.", note:"Support pick."},
 {n:"BUDS", tier:"B", eff:"Underwater time 7 s → 14 s.", note:""},
 {n:"Trained Runner", tier:"B", eff:"Sprint speed 700–750 (default 600).", note:"Runner role; good for night escapes."},
 {n:"Alcoholic", tier:"B", eff:"Beer bonus lasts 3× as long.", note:"Added 2026-09-23. Pairs with Legendary hunting."},
 {n:"Bug Net", tier:"–", eff:"35% chance to add two of a bait to your tacklebox (reworked 10-28). Doesn't work on bait you dropped from the tacklebox.", note:""},
 {n:"Deadman's Hand", tier:"–", eff:"Named in a 10-28 fix: it no longer instantly reels Legendary+ fish that then swim away.", note:""},
 {n:"Bigger Tacklebox", tier:"–", eff:"Listed perk; no effect published yet.", note:""}
];

const UPGRADES = [
 {t:"S", n:"Big Grill", eff:"+50% cooking bonus when maxed.", src:"o"},
 {t:"S", n:"Fish Value", eff:"+50% to every sale and sacrifice when maxed.", src:"o"},
 {t:"A", n:"Line (depth)", eff:"Go deeper without snapping. 2,500+ depth for big fish.", src:"o"},
 {t:"A", n:"Sinker", eff:"Bait-score lever. Max it for Bigguns.", src:"o"},
 {t:"B", n:"Leviathan + Fish Frenzy totems", eff:"Team-wide buffs for higher day counts.", src:"o"},
 {t:"C", n:"Clinket trinkets (8)", eff:"1.0 trinkets. Choose and level them; activating one gives a big temporary buff. The devs call it \"a form of gambling.\"", src:"w"}
];

const PATCHES = [
 ["2026-09-23","Alcoholic perk added."],
 ["2026-09-26","Sharkman remade."],
 ["2026-10-03","Legendary bait-score floor lowered 200 → 175. Intro cutscene can be skipped."],
 ["2026-10-06","Minnow traps can be harvested every morning."],
 ["2026-10-20","1.0 release: ending, Lake Entity boss, MOBY rod, 8 trinkets, Rhizodus. Hotfix: Legendary/Mythic achievements now unlock for the whole lobby."],
 ["2026-10-22","BUFFS: ~1/3 of shop items −30%. Gambling win odds +8%. Line/rod/sinker upgrades −15% (−10% more at level 7). Troll from day 2. Fish Frenzy max 75% / 250 gold. Slowing Metabolism works continuously. Skeeter gives a musket twice as often. Boss: eyeball hitbox +50%, rolling turtle damage 75 → 60, heal delay 7.5 s → 6 s, healing +10%."],
 ["2026-10-22","YETI: Yeti now spawns on the Arctic. Invisible whale nuke damage fixed. Croc dragging players into cliffs fixed."],
 ["2026-10-23","Jeremy Wade Phase 1: higher prices, no quota relief after the boss, boss HP +20%, healing halved, heart revives removed."],
 ["2026-10-28","Halloween: Jungle unlocks day 7, Swamp day 14. Bug Net rework. Hearts back on Jeremy Wade. Hardcore saves deleted on game over. 50% chance the crab jumpscare is a pumpkin."],
 ["2026-11-11","New Creature + Stuff n things: Puffer Boar. Terrorist made killable. Minnow trap re-buy and 0-cost upgrades in 8-player lobbies fixed. Flying bats now despawn after sleep."]
];

const MILESTONES = [
 {d:1, t:"Early trader visits around day 1–2. Clinket's balloon trader comes by at midday."},
 {d:2, t:"Trolls can appear from now on (3 TNT, 86-score ragdoll)."},
 {d:7, t:"Jungle unlocks. First perk unlock (7 days survived)."},
 {d:14, t:"Swamp unlocks. Next perk unlock."},
 {d:20, t:"Midas Touch totem starts to pay off."},
 {d:21, t:"Perk unlock (every 7 days)."},
 {d:28, t:"Perk unlock."},
 {d:40, t:"Official \"Biggun\" benchmark: max sinker + beer + Leviathan totem + 2,500+ depth."}
];

const GOALS = [
 {g:"Run", items:[["surv7","Survive 7 days (first perk)"],["jungle","Unlock the Jungle (day 7)"],["swamp","Unlock the Swamp (day 14)"],["day40","Reach day 40"]]},
 {g:"Upgrades", items:[["grill","Max the Big Grill"],["fval","Max Fish Value"],["lev4","Leviathan's Totem level 4"],["frenzy","Max Fish Frenzy"],["light","Timeless Light (before Arctic)"]]},
 {g:"Hunting", items:[["troll","Kill a Troll for 86-score bait"],["leg","Catch any Legendary"],["nessie","Catch the Lochness Monster"],["mythic","Catch a Mythic"]]},
 {g:"Endgame", items:[["boss","Defeat the Lake Entity"],["moby","Get the MOBY rod"],["rhizo","Catch Rhizodus"],["jw","Survive a run on Jeremy Wade"],["hc","Survive a Hardcore run"]]}
];
