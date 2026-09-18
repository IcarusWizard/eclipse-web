# 03. Technology Catalog & Tech Tray

---

## 1. Research Mechanics & Discounts

- **Tech Tracks**: Each player board has 3 tracks: **Military**, **Grid**, and **Nano**.
- Each track accommodates up to **7 Technology Tiles** (indices 0 to 6).
- **Canonical Discount Table**:
  Every technology researched in a category exposes a discount on the track for future technologies in that same category:

| Slot # | Researched Techs in Track | Discount for Next Tech | Track Row Victory Points |
| :---: | :---: | :---: | :---: |
| 1 | 0 | **0** | 0 VP |
| 2 | 1 | **1** | 0 VP |
| 3 | 2 | **2** | 0 VP |
| 4 | 3 | **3** | 0 VP |
| 5 | 4 | **4** | **1 VP** |
| 6 | 5 | **6** | **2 VP** |
| 7 | 6 | **8** | **3 VP** |
| Complete | 7 | Full | **5 VP** |

$$\text{Actual Science Paid} = \max\bigl(\text{Tech.minCost},\; \text{Tech.baseCost} - \text{Discount}\bigr)$$

- **Rare Technologies**: Can be placed on any track of the player's choice. Once placed, they count toward that track's discount progression and row victory points.

---

## 2. Regular Technologies (24 Total — 4 Copies Each = 96 Tiles)

### Military Track
| ID | Technology | Tier | Base Cost | Min Cost | Description / Effect |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `neutron_bombs` | **Neutron Bombs** | 1 | 2 | 2 | Automatically destroys all opponent Population Cubes in a sector during Attacking Population (unless defended by Neutron Absorber). |
| `starbase` | **Starbase** | 2 | 4 | 3 | Allows constructing Starbases (cost 3 Materials, max 1 per sector). |
| `plasma_cannon` | **Plasma Cannon** | 3 | 6 | 4 | Unlocks Plasma Cannon ship part (1 Orange die = 2 damage, consumes 2 energy). |
| `phase_shield` | **Phase Shield** | 4 | 8 | 5 | Unlocks Phase Shield ship part (-2 to opponent attack rolls, consumes 1 energy). |
| `advanced_mining` | **Advanced Mining** | 5 | 10 | 6 | Allows colonizing Advanced Material habitats with Colony Ships. |
| `tachyon_source` | **Tachyon Source** | 6 | 12 | 6 | Unlocks Tachyon Source ship part (+9 energy generated). |
| `gluon_computer` | **Gluon Computer** | 7 | 14 | 7 | Unlocks Gluon Computer ship part (+3 hit bonus, +3 initiative, consumes 2 energy). |
| `plasma_missile` | **Plasma Missile** | 8 | 16 | 8 | Unlocks Plasma Missile ship part (fires 2 Orange dice = 2 damage per hit before engagement rounds). |

### Grid Track
| ID | Technology | Tier | Base Cost | Min Cost | Description / Effect |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `gauss_shield` | **Gauss Shield** | 1 | 2 | 2 | Unlocks Gauss Shield ship part (-1 to opponent attack rolls, 0 energy). |
| `improved_hull` | **Improved Hull** | 2 | 4 | 3 | Unlocks Improved Hull ship part (+2 Hull hit points, 0 energy). |
| `fusion_source` | **Fusion Source** | 3 | 6 | 4 | Unlocks Fusion Source ship part (+6 energy generated). |
| `positron_computer` | **Positron Computer** | 4 | 8 | 5 | Unlocks Positron Computer ship part (+2 hit bonus, +2 initiative, consumes 1 energy). |
| `advanced_economy` | **Advanced Economy** | 5 | 10 | 6 | Allows colonizing Advanced Money habitats with Colony Ships. |
| `tachyon_drive` | **Tachyon Drive** | 6 | 12 | 6 | Unlocks Tachyon Drive ship part (Drive Speed 3, +3 initiative, consumes 3 energy). |
| `antimatter_cannon` | **Antimatter Cannon**| 7 | 14 | 7 | Unlocks Antimatter Cannon ship part (1 Blue die = 4 damage, consumes 4 energy). |
| `quantum_grid` | **Quantum Grid** | 8 | 16 | 8 | Immediately grants **+2 bonus Influence Discs** to the player's Influence Track. |

### Nano Track
| ID | Technology | Tier | Base Cost | Min Cost | Description / Effect |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `nanorobots` | **Nanorobots** | 1 | 2 | 2 | Increases Build action activations by +1 (from 2 to 3 for Humans). |
| `fusion_drive` | **Fusion Drive** | 2 | 4 | 3 | Unlocks Fusion Drive ship part (Drive Speed 2, +2 initiative, consumes 2 energy). |
| `advanced_robotics` | **Advanced Robotics** | 3 | 6 | 4 | Immediately grants **+1 bonus Influence Disc** to the player's Influence Track. |
| `orbital` | **Orbital** | 4 | 8 | 5 | Allows constructing Orbitals in controlled sectors (4 Materials, max 1 per sector). |
| `advanced_labs` | **Advanced Labs** | 5 | 10 | 6 | Allows colonizing Advanced Science habitats with Colony Ships. |
| `monolith` | **Monolith** | 6 | 12 | 6 | Allows constructing Monoliths in controlled sectors (10 Materials, max 1 per sector, +2 VP). |
| `wormhole_generator`| **Wormhole Generator**| 7 | 14 | 7 | Allows your ships to traverse through unconnected open half-wormholes. |
| `artifact_key` | **Artifact Key** | 8 | 16 | 8 | Collects resources or grants VP for controlled Artifacts. |

---

## 3. Rare Technologies (16 Unique Tiles — 1 Copy Each)

| ID | Technology | Base Cost | Min Cost | Description / Effect |
| :--- | :--- | :---: | :---: | :--- |
| `advanced_military` | **Advanced Military** | 11 | 7 | Research an additional Military technology immediately for free. |
| `advanced_grid` | **Advanced Grid** | 11 | 7 | Research an additional Grid technology immediately for free. |
| `advanced_nano` | **Advanced Nano** | 11 | 7 | Research an additional Nano technology immediately for free. |
| `ancient_labs` | **Ancient Labs** | 13 | 9 | Immediately draw and resolve 1 Discovery Tile. |
| `antimatter_missile` | **Antimatter Missile** | 15 | 10 | Unlocks Antimatter Missile (1 Blue die = 4 damage per missile). |
| `cloaking_device` | **Cloaking Device** | 9 | 6 | Prevents pinning: enemy ships do not pin your ships in combat. |
| `conformal_drive` | **Conformal Drive** | 13 | 9 | Unlocks Conformal Drive (Drive Speed 4, +2 initiative, consumes 2 energy). |
| `gluon_shield` | **Gluon Shield** | 11 | 7 | Unlocks Gluon Shield (-3 to opponent attack rolls, consumes 2 energy). |
| `improved_logistics` | **Improved Logistics** | 11 | 7 | Grants +1 Move activation per action. |
| `interceptor_bay` | **Interceptor Bay** | 7 | 5 | Unlocks Interceptor Bay ship part (allows Dreadnought to carry Interceptors). |
| `metasynthesis` | **Metasynthesis** | 15 | 10 | Colonize ANY advanced habitat (Money, Science, or Material) without advanced techs. |
| `neutron_absorber` | **Neutron Absorber** | 9 | 6 | Protects your population against opponent Neutron Bombs. |
| `orbital_mining` | **Orbital Mining** | 9 | 6 | Orbitals now also produce +1 Material during Upkeep. |
| `point_defense` | **Point Defense** | 9 | 6 | Ships fire light interceptors during Missile stage to shoot down enemy missiles. |
| `sentinel` | **Sentinel** | 9 | 6 | Allows deploying Sentinels in controlled sectors. |
| `transition_drive` | **Transition Drive** | 13 | 9 | Unlocks Transition Drive (instant warp across controlled sectors). |

---

## 4. Tech Tray & Bag Rules

- **Tech Bag**: Contains 112 tiles total (96 regular + 16 rare).
- **Setup Draw**:
  - 2 Players: Draw until **12 regular tiles** are drawn.
  - 3 Players: Draw until **14 regular tiles** are drawn.
  - 4 Players: Draw until **16 regular tiles** are drawn.
  - 5 Players: Draw until **18 regular tiles** are drawn.
  - 6 Players: Draw until **20 regular tiles** are drawn.
- **Round Replenishment (Cleanup Phase)**:
  - Each round during Cleanup, draw from the bag until **$\text{Player Count} + 3$ regular tiles** are drawn.
  - **Rare tiles do NOT count** toward the replenishment limit; they are placed in open rare slots and remain available.
