# 01. Setup & Core Concepts

---

## 1. Game Components Overview

- **Sectors**: Hexagonal tiles categorized into Rings:
  - **Center Sector 001**: Galactic Center Defense System (GCDS).
  - **Ring 1 (Inner)**: Sectors 101–110 (10 sectors).
  - **Ring 2 (Middle)**: Sectors 201–214, 281 (13 sectors).
  - **Ring 3 (Outer)**: Sectors 301–318, 381–382 (20 sectors).
  - **Home Sectors**: Specific to each player/faction (e.g. Terran 221–226).
- **Player Materials**:
  - **Ship Miniatures**: 8 Interceptors, 4 Cruisers, 2 Dreadnoughts, 4 Starbases per player.
  - **Influence Discs**: 13 starting discs per player (expandable up to 16 with tech).
  - **Population Cubes**: 33 cubes per player (11 Money, 11 Science, 11 Material).
  - **Colony Ships**: 3 per player for Humans (printed faceup on board or wooden tokens).
  - **Storage Markers**: 3 markers on the Storage Track (Money, Science, Material).
- **Trays & Bags**:
  - **Tech Tray & Bag**: White bag with 112 tiles (96 regular, 16 rare).
  - **Reputation Bag**: Black bag with 33 tiles (16x 1 VP, 9x 2 VP, 5x 3 VP, 3x 4 VP).
  - **Upgrade Tray**: Supply of standard Ship Part tiles.
  - **Discovery Tiles**: Shuffled facedown stack.
  - **Dice**: Yellow (Ion), Orange (Plasma), Blue (Antimatter), Red.
  - **Structures**: Miniatures for Orbitals and Monoliths.

---

## 2. Setup by Player Count

| Player Count | Inner (I) Stack | Middle (II) Stack | Outer (III) Stack | Starting Tech Tiles Drawn |
| :---: | :---: | :---: | :---: | :---: |
| **2 Players** | All 8 tiles | All 14 tiles | **5 tiles** | **12 regular tiles** + any drawn Rare |
| **3 Players** | All 8 tiles | All 14 tiles | **8 tiles** | **14 regular tiles** + any drawn Rare |
| **4 Players** | All 8 tiles | All 14 tiles | **14 tiles** | **16 regular tiles** + any drawn Rare |
| **5 Players** | All 8 tiles | All 14 tiles | **16 tiles** | **18 regular tiles** + any drawn Rare |
| **6 Players** | All 8 tiles | All 14 tiles | **18 tiles** | **20 regular tiles** + any drawn Rare |

### Player Setup Steps
1. Take a Species Board (Human side or Alien side) and matching components.
2. Place 11 Population Cubes on each of the 3 Population Tracks (Money, Science, Material), covering spaces 3 through 28. Space 2 (base income) remains uncovered.
3. Place 13 Influence Discs on the Influence Track (covering spaces from right to left).
4. Place Storage Markers at starting values (Humans: 3 Money, 2 Science, 4 Materials).
5. Deploy Home Sector to the galaxy grid:
   - Place 1 Influence Disc from Influence Track onto the Home Sector (12 discs remain on track; Upkeep = 0).
   - Colonize the starting non-advanced planets: move 1 Money cube, 1 Science cube, and 1 Material cube to the Home Sector (10 cubes remain on each track, making active income +3).
   - Place starting ship (1 Interceptor) in Home Sector.
6. Ready all 3 Colony Ships (faceup).

---

## 3. Core Concepts

### Zones and Rings
- The galaxy is arranged in concentric hexagonal rings around Sector 001 (Center):
  - **Ring 0**: Galactic Center (Sector 001).
  - **Ring 1 (Inner)**: Directly adjacent to Center.
  - **Ring 2 (Middle)**: Distance 2 from Center.
  - **Ring 3 (Outer)**: Distance 3 from Center.

### Wormholes & Connections
- Sectors have wormhole edges (represented by half-wormhole semicircles):
  - **Connected**: Two adjacent sectors are connected if both adjacent edges contain a half-wormhole.
  - **Warp Portals**: Sectors with Warp Portals are considered connected to all other sectors with Warp Portals.
  - **Wormhole Generator Tech**: Allows a player's ships to traverse open half-wormholes into empty half-wormholes, but does NOT allow opponents to cross back unless they also possess the tech.

### Habitats and Population Squares
- Planet slots come in standard and advanced types:
  - **Standard Slots**: May be colonized without prerequisites.
  - **Advanced Slots (Bordered)**: Require the corresponding Advanced Technology (`advanced_economy`, `advanced_labs`, `advanced_mining`, or `metasynthesis`).
  - **Wild / Gray Slots**: Can be colonized with Money, Science, or Material of the player's choice. (If advanced, requires corresponding advanced tech).
  - **Orbitals**: Built via the BUILD action (4 Materials). Functions as a wild population square for **Money or Science only** (Material is rejected).

### Structures
- **Orbitals**: Cost 4 Materials, require `orbital` tech. Max 1 per sector. Adds 1 population habitat (Money or Science).
- **Monoliths**: Cost 10 Materials, require `monolith` tech. Max 1 per sector. Awards **+2 VP** to the player controlling the sector at end of game.
- Structures cannot be destroyed or removed from a sector.

---

## 4. Resources, Storage & Trade

### The Three Resources
1. **Money (Credits) 💰**: Used to pay Civilization Upkeep at the end of each round.
2. **Science 🔬**: Used to research new technologies during the Action Phase.
3. **Materials ⚙️**: Used to build ships, starbases, and structures.

### Storage Track Rules
- Track goes from 0 to 40.
- If a player exceeds 40 resources, the Storage Marker is rotated so its 4-pointed star faces the center, indicating $40 + \text{track value}$.

### Trade Ratio
- **Standard Humans**: **2:1 Trade Ratio** (2 of any resource may be traded for 1 of another at any time during an action or upkeep).
- Alien species may have specialized trade ratios (e.g. Planta 3:1, Eridani 2:1, Mechanema 2:1).
- Emergency trading occurs automatically during Upkeep to avoid bankruptcy.

---

## 5. Ship Blueprints Anatomy

Every ship blueprint contains a grid of component slots:
- **Interceptor**: 4 slots. Base Initiative: 2. Base Build Cost: 3.
- **Cruiser**: 6 slots. Base Initiative: 1. Base Build Cost: 5.
- **Dreadnought**: 8 slots. Base Initiative: 0. Base Build Cost: 8.
- **Starbase**: 5 slots. Base Initiative: 4. Base Build Cost: 3. Max 1 per sector.

### Blueprint Validation Rules
1. **Energy / Power**: The sum of energy generated by Power Sources (`nuclear_source`, `fusion_source`, `tachyon_source`) must be **$\ge$** the total energy consumed by drives, computers, shields, and weapons.
2. **Drives**: Every mobile ship (Interceptor, Cruiser, Dreadnought) **must have at least one Drive** (`nuclear_drive`, `fusion_drive`, `tachyon_drive`, `conformal_drive`). Starbases cannot have drives.
3. **Hull / Hit Points**: Each ship has 1 base hit point plus hit points from equipped Hulls.
