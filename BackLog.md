- [x] **Wild (Gray) Population Slots & Orbitals**:
  - Implemented resource cube picker modal/buttons for wild gray slots (Money, Science, or Material) and Orbitals (Money or Science only, rejects Material per rules).
  - Orbitals cost 4 Materials and require the Orbital technology, strictly capped at 1 per sector.
  - Sector abandonment via the INFLUENCE action cleanly returns population cubes from all planets/orbitals back to their respective player board tracks.
- [x] **Income Cubes & Forecast on Player Board**:
  - Slot values on the player board income tracks are always legible with subtle slot indicator numbers even when occupied by population cubes.
  - Added an Income Forecast calculation engine (`getIncomeForecast`) and UI cards showing current income, next 1-cube delta, and next 2-cube delta for Money, Science, and Materials across both PlayerBoard and PhysicalPlayerBoardModal.
- [x] **Bankruptcy Logic & Civilization Collapse**:
  - Implemented the official multi-step bankruptcy procedure when a player cannot afford upkeep at the end of the Upkeep phase:
    1. Automatic emergency trading at the faction trade ratio (2:1 for Humans) from Materials to Credits, then Science to Credits.
    2. Controlled non-home sectors are systematically abandoned one-by-one (returning influence discs to the track, lowering upkeep, and returning all population cubes).
    3. Home sector abandonment if the budget deficit persists.
    4. Civilization collapse / elimination (`isEliminated: true`), clearing player ships and skipping eliminated commanders in future turns.
- [x] **Reputation Tiles System**:
  - Implemented the official 33-tile reputation bag (16x 1 VP, 9x 2 VP, 5x 3 VP, 3x 4 VP).
  - Post-combat resolution awards participation tiles (1 tile) plus destruction reward tiles (1 tile for Interceptor/Starbase/Ancient, 2 for Cruiser/Guardian, 3 for Dreadnought/GCDS) up to a max draw of 5 tiles per battle.
  - Created `ReputationTileModal` for interactive tile selection and placement onto the 5-slot reputation track, allowing strategic replacement of existing lower-value tiles when full.
- [x] **Combat Retreat**:
  - Implemented official tactical retreat mechanics: during a ship's activation in initiative order, the player can declare a retreat to an adjacent friendly-controlled sector connected by wormholes with no enemy ships present.
  - On the ship's subsequent activation (in the next Engagement Round), the retreat completes and the ship safely moves into the destination sector with damage repaired.
  - Forfeits participation reputation tile if all remaining ships of a player attempted retreat.
- [x] **Population Bombardment before Influence (Attacking Population)**:
  - Implemented official "Attacking Population" rules (rulebook pages 21 & 24): at the conclusion of ship combat, surviving victorious ships attack opponent population cubes once with non-missile weapons against 0 shield (modified roll >= 6 or natural 6 hits), destroying 1 population cube per damage point.
  - With `neutron_bombs` technology, all population cubes in the sector are annihilated automatically (unless defender has `neutron_absorber`).
  - Destroyed population cubes return to the defender's player board tracks.
  - Defender retains their influence disc if ANY population cube survives bombardment. Only when 0 opponent population cubes remain can the defender's influence disc be overthrown and the victor claim control via `COMBAT_CONQUEST`.
- [x] **Ship Base Initiative & Defender Tie-Breaking**:
  - Corrected official Human ship base initiative bonuses in `shipValidation.ts`:
    - Interceptor: Base = 2 (starts with Nuclear Drive +1 $\to$ total starting initiative 3).
    - Cruiser: Base = 1 (starts with Nuclear Drive +1 & Electron Computer +1 $\to$ total starting initiative 3).
    - Dreadnought: Base = 0 (starts with Nuclear Drive +1 & Electron Computer +1 $\to$ total starting initiative 2).
    - Starbase: Base = 4 (starts with Electron Computer +1 $\to$ total starting initiative 5).
  - Implemented official tie-breaking rule (rulebook page 20): initiative ties between opponents are resolved in favor of the Defender.
- [x] **Plasma Cannon Die Count**:
  - Corrected `plasma_cannon` weapon profile in `partData.ts` to roll 1 orange die (inflicting 2 damage per hit) instead of 2 dice.
- [x] **Reputation Tiles Visibility on Player Board**:
  - Created an authentic 5-slot Reputation Track section with cardboard tile indentations on `PhysicalPlayerBoardModal.tsx`, showing placed tiles (+VP values, trophy crests), empty slots, and total Reputation VP.
  - Added a prominent Reputation Track indicator with total VP and placed tile chips to the floating `PlayerBoard.tsx` dashboard.
- [x] **Combat Resolution Order**:
  - Implemented official rule (rulebook page 20): multiple sector battles resolve in **descending Sector Number order** (`b.sectorNumber - a.sectorNumber`).
- [x] **Influence Action Implementation**:
  - Added official `INFLUENCE` action button to `ActionBar.tsx` with base 2 activations for Humans.
  - Created `InfluenceModal.tsx` supporting:
    - Automatically readying up to 2 used Colony Ships (flipped faceup).
    - Selecting up to 2 sector activations: claiming uncontrolled sectors (with stationed ship or wormhole connection to friendly sector) or abandoning controlled sectors (returning influence disc to track and returning all population cubes to the board).
    - Live net disc cost and upkeep calculation.
- [x] **Top-Left UI De-cluttering & Simplification**:
  - Added a minimize/collapse toggle (`ChevronUp`/`ChevronDown`) to `PlayerBoard.tsx` that shrinks the HUD into an ultra-compact mini bar showing only essentials (player color/name, credits, science, materials, discs, colony ships, reputation VP, and quick action buttons) to leave the galaxy map completely unobstructed.
  - Made Fleet Supply and Researched Techs collapsible accordion drawers in expanded mode, eliminating visual clutter.
- [x] **Default Legal Orientation for Explored Tiles**:
  - Automatically calculates and sets the initial orientation of explored sector tiles (`findLegalExploreRotation`) to the first rotation that establishes an open, legal wormhole connection with the exploring source sector (accounting for `wormhole_generator` tech if owned).
  - Rewards highest priority to full two-way wormhole connections (+100) and bonus score (+10) for additional open wormhole connections to other existing adjacent sectors.
  - Enables immediate placement confirmation and displays green "Wormholes Connected" status without requiring manual rotation steps.
  - Made the connection status badge in `ExploreModal` clickable to immediately snap back to the next legal rotation if manually rotated.
- [x] **Advanced Robotics Bonus Influence Disc Count**:
  - Fixed an issue where researching Advanced Robotics incorrectly granted 2 bonus Influence Discs because it was grouped with Quantum Grid.
  - Advanced Robotics now strictly awards **1 bonus Influence Disc** (+1 `totalDiscs` and +1 `discsOnTrack`) per the official rulebook, while Quantum Grid continues to award 2.
- [x] **Second Dawn Technology Discounts Track**:
  - Replaced the 1st edition tier-based discount arrays with the official Eclipse: Second Dawn Research Track discount progression printed on the physical player board: `[0, 1, 2, 3, 4, 6, 8]`.
  - The science cost to research a technology is computed as `max(minCost, baseCost - trackDiscount)` based on the number of previously researched technologies in that category track.
- [x] **Population Track Maximum Income (+28) and 11 Cubes**:
  - Corrected the population tracks from 12 cubes down to the official 11 cubes per resource track (values: 2 base, 3, 4, 6, 8, 10, 12, 15, 18, 21, 24, 28). Removed the nonexistent +32 income space.
  - Setup initializes with 10 cubes on the player board per track (1 cube deployed to the home system, uncovering the 3 income space).
  - Updated player board modal UI and income forecast calculations accordingly.
- [x] **Combat Phase Population Bombardment in Undefended Controlled Sectors**:
  - Combat Phase now systematically evaluates all sectors where a player has ships in an opponent-controlled or populated sector, even when the defender has zero defending ships (meaning no fleet battle was triggered).
  - Ships bombard opponent population cubes once with non-missile weapons (or wipe them with Neutron Bombs).
  - If all population cubes are destroyed, the defender's influence disc is overthrown, and the attacker is prompted with `COMBAT_CONQUEST` to take control and colonize open habitats.
- [x] **Official 15 Rare Technologies & 114 Tech Tiles Bag**:
  - Verified every single technology against official rulebook page 31 (Tech Sheet / Player Aid), page 11 (Tech Descriptions), page 10 (Research Rules), and page 3 (Components):
    - Removed `rift_cannon`, which was from Eclipse 1st edition (*Rise of the Ancients*) and does not exist in *Eclipse: Second Dawn for the Galaxy*.
    - Verified the exact canonical list of **15 Rare Technologies** (1 copy each):
      1. `Antimatter Splitter` (Cost 5, Min 5): Splits damage from Antimatter Cannons freely over targets.
      2. `Neutron Absorber` (Cost 5, Min 5): Immune to enemy Neutron Bombs.
      3. `Conifold Field` (Cost 5, Min 5): Unlocks Conifold Field ship part (+3 Hull, 2 Energy consumed).
      4. `Absorption Shield` (Cost 7, Min 6): Unlocks Absorption Shield ship part (-1 Shield, +4 Energy).
      5. `Cloaking Device` (Cost 7, Min 6): 2 enemy ships required to pin each of your ships.
      6. `Improved Logistics` (Cost 7, Min 6): +1 Move Activation per Move Action.
      7. `Sentient Hull` (Cost 7, Min 6): Unlocks Sentient Hull ship part (+1 Computer, +1 Hull).
      8. `Soliton Cannon` (Cost 9, Min 7): Unlocks Soliton Cannon ship part (1 blue die, 3 damage, 3 Energy consumed).
      9. `Transition Drive` (Cost 9, Min 7): Unlocks Transition Drive ship part (Speed 3, 0 Energy consumed).
      10. `Warp Portal` (Cost 9, Min 7): Immediately place Warp Portal tile on any controlled sector (1 VP at game end).
      11. `Flux Missile` (Cost 11, Min 8): Unlocks Flux Missile ship part (2 yellow dice salvo, +1 Initiative).
      12. `Pico Modulator` (Cost 11, Min 8): +2 Upgrade Activations per Upgrade Action.
      13. `Ancient Labs` (Cost 13, Min 9): Immediately draw and resolve one Discovery Tile.
      14. `Zero-Point Source` (Cost 15, Min 10): Unlocks Zero-Point Source ship part (+12 Energy generated).
      15. `Metasynthesis` (Cost 17, Min 11): Place population cubes on any advanced squares.
  - Implemented the authentic **114 Tech Tiles Bag** (39 unique techs) per rulebook page 3:
    - 33 Military Techs (5, 5, 5, 5, 4, 3, 3, 3)
    - 33 Grid Techs (5, 5, 5, 5, 4, 3, 3, 3)
    - 33 Nano Techs (5, 5, 5, 5, 4, 3, 3, 3)
    - 15 Rare Techs (1 copy each)
    - 99 regular + 15 rare = 114 tiles total.
  - Added official setup drawing (`drawTechTilesForSetup` per rulebook page 5: 12 regular tiles for 2p, 14 for 3p, 16 for 4p, etc., rare tiles placed on tray bottom row without counting against limit) vs round cleanup drawing (`drawTechTilesForRound` per rulebook page 25: 5 regular tiles for 2p, 7 for 4p, etc.).
  - Corrected ship part attributes for `conifold_field` (3 Hull, 2 power consumed), `soliton_cannon` (blue die dealing 3 damage, 3 power consumed), and `transition_drive` (speed 3, 0 power consumed).
- [x] **Ship Initiative Calculation & Component Initiative Labeling**:
  - Fixed component attributes in `partData.ts`: computers provide `computerBonus` (to-hit roll modifier) with 0 initiative, and power sources generate energy with 0 initiative. In *Eclipse: Second Dawn*, only Drives (and specific parts like Flux Missiles) confer initiative bonuses.
  - A Cruiser equipped with *Soliton Cannon, Gluon Computer, Improved Hull, Tachyon Source, Fusion Drive, Improved Hull* now correctly evaluates to **+3 Initiative** (Base 1 + Fusion Drive 2 = 3), resolving the issue where it previously displayed +6.
  - Blueprint slot badges and tray component cards in `ShipBlueprintEditor.tsx` now explicitly show `+X Init`, `+X Hit`, and `-X Shield` to clearly indicate what each component provides.
  - Added an Initiative breakdown to the Blueprint Stats HUD (`+X Init (Base +Y | Parts +Z)`).
- [x] **Maintenance / Upkeep Cost Table**:
  - Corrected `UPKEEP_TABLE` in `economyEngine.ts` to match the official Second Dawn Control Board: placing all 13 starting discs (leaving 0 discs on track) incurs an upkeep of **30** Credits (previously was 25).
  - Validated the complete progression: `[16-11: 0, 10: 1, 9: 2, 8: 3, 7: 5, 6: 7, 5: 10, 4: 13, 3: 17, 2: 21, 1: 25, 0: 30]`.
- [x] **Official 6 Alien Factions & Turn-by-Turn Pre-Game Draft**:
  - Implemented all 6 official Alien Species from the *Eclipse: Second Dawn* rulebook (pages 26–28):
    1. **Eridani Empire** (Sector 222): 26 Credits, 2 Science, 4 Materials, 11 starting discs (starts with 2 fewer), starts with 2 facedown reputation tiles drawn from the bag, starting techs (*Gauss Shield, Fusion Drive, Plasma Cannon*), preprinted +1 power on Interceptor/Cruiser/Dreadnought, 3:1 trade ratio.
    2. **Hydran Progress** (Sector 224): 2 Credits, 6 Science, 2 Materials, 13 discs, starting tech (*Advanced Labs*), 2 Research activations per action, starting population cube on Advanced Science space of Sector 224 (leaving 9 Science cubes on board), 3:1 trade ratio.
    3. **Planta** (Sector 226): 2 Credits, 3 Science, 4 Materials, 4 ready colony ships, starting tech (*Starbase*), 2 Explore activations per action, compact blueprints (-1 slot and -1 base init with preprinted +1 computer and +2 power on ships, +5 power on Starbase), population cubes automatically destroyed by opponent ships in sector, +1 bonus VP per controlled sector at game end, 3:1 trade ratio.
    4. **Descendants of Draco** (Sector 228): 2 Credits, 4 Science, 3 Materials, 13 discs, starting tech (*Fusion Drive*), peaceful coexistence with Ancients (Ancients do not pin Draco ships, Draco can place influence discs in Ancient sectors, no combat between Draco and Ancients alone), +1 VP per Ancient ship on the board at game end, 3:1 trade ratio.
    5. **Mechanema** (Sector 230): 3 Credits, 3 Science, 4 Materials, starting tech (*Positron Computer*), 3 Upgrade and 3 Build activations per action, discounted construction costs (Interceptor 2, Cruiser 4, Dreadnought 7, Starbase 2, Orbital 3, Monolith 8), 3:1 trade ratio.
    6. **Orion Hegemony** (Sector 232): 3 Credits, 3 Science, 4 Materials, starting techs (*Neutron Bombs, Gauss Shield*), starts with a Cruiser instead of an Interceptor in Sector 232, +1 base initiative on all ship blueprints, preprinted power (+1 Interceptor, +2 Cruiser, +3 Dreadnought), 4:1 trade ratio.
  - Implemented an interactive pre-game **Turn-by-Turn Drafting System** (`NewGameModal.tsx`) supporting 1–6 players with category filters (All / Alien / Terran), faction ability inspection cards, step-by-step turn drafting, and quick randomize.
- [x] **Map Sector VP Prominence & De-cluttering**:
  - Removed long sector names from the map hexes in `HexGalaxyMap.tsx` to eliminate text clutter and overlapping. Full sector names and thematic lore remain readily accessible in the `SectorInspector` panel.
  - Replaced crowded labels on the map with clean identifiers (`SEC {sectorNumber}` or `GCDS 001`) and added a prominent, high-contrast golden victory point crest badge (`★ {VP} VP`).
  - Automatically offsets shipyard and active indicators to prevent badge overlapping.
- [x] **Custom Distinct Orbital SVG Icon**:
  - Replaced the standard circular planet representation for Orbitals on the galaxy map with a bespoke SVG space habitat station:
    - Horizontal photovoltaic solar collector wings.
    - Central station core hub.
    - Rotating habitat ring rendered with dashed stroke when unoccupied and solid player color when colonized.
- [x] **Home System Orientation & Arrow Facing Galactic Center**:
  - Implemented `getEdgeTowardCenter(coord: HexCoord): HexEdge` in `hexMath.ts` calculating the exact edge whose neighbor is closest to the Galactic Center (0, 0).
  - Ensured all starting home sector definitions (Terran Union, Eridani, Hydran, Planta, Draco, Mechanema, Orion) in `sectorData.ts` have a printed wormhole on base Edge 0 (`wormholes[0] === true`).
  - During game initialization (`setup.ts`), set `homeSector.rotation = getEdgeTowardCenter(startCoord)`, guaranteeing an open half-wormhole facing directly toward the Galactic Center across all player setups (1 to 6 players).
  - In `HexGalaxyMap.tsx`, rendered the authentic physical board arrow chevron indicator pointing outward toward the center on the oriented edge.
- [x] **Planta 2 Explore Activations**:
  - Implemented the official Planta 2 Explore activations per action disc:
    - 1st Explore deducts 1 action disc from the track and sets `pendingExploreActivations = 1`.
    - Turn advancement is held so Planta immediately retains the active turn.
    - Added a prominent top banner: `🌿 Planta Exploration: 1 Explore Activation remaining! Select an adjacent hex on the map to explore, or finish exploration.`
    - 2nd Explore executes without deducting an additional action disc (`isSecondActivation`), clearing `pendingExploreActivations` and advancing the turn.
    - Added `FINISH_EXPLORE` action allowing Planta to pass or forfeit the 2nd activation at any time.
- [x] **Descendants of Draco Explore: Reveal 2 Sector Tiles & Pick 1**:
  - Implemented the official Draco species ability: when exploring, Draco draws 2 sector tiles from the ring deck.
  - Updated `ExploreModal.tsx` to display an interactive candidate tile picker banner allowing Draco commanders to inspect and toggle between Tile 1 and Tile 2.
  - The chosen tile is placed (or discarded) on the map, while the unchosen tile is automatically placed face-down at the bottom of the sector stack (`deck.unshift(...)`) per official rules.
- [x] **Descendants of Draco Claiming Sectors with Ancients**:
  - Implemented peaceful Ancient coexistence in both Explore and Influence actions:
    - In `ExploreModal.tsx`, Draco is permitted to place an Influence Disc even when `ancientsCount > 0`, displaying a `🐉 Ancient Coexistence` status badge.
    - In `InfluenceModal.tsx`, updated `eligibleToClaim` and `gameReducer.ts` action validation so Draco can claim uncontrolled sectors containing Ancients without triggering hostility checks.
    - Ancients do not pin Draco ships or prevent influence disc placement.
- [x] **Game Persistence & Table Rejoining by Number**:
  - Created `persistence.ts` and `TableSessionModal.tsx` providing automatic local storage auto-save on every state transition.
  - Each game session is assigned a clean 3-digit table code (e.g. `Table #742` or custom query `?table=742`).
  - Added a `Table #XXX` button in the top `Header.tsx` bar allowing commanders to:
    - View active table number and copy direct shareable/rejoin links.
    - Enter any table number to switch or resume a previous game.
    - Browse and 1-click restore from a list of all saved browser games.
    - State is completely preserved across browser refreshes, file edits, and Vite HMR reloads.
- [x] **Hydran Progress Double Research**:
  - Implemented Hydran's 2 Research activations per action disc:
    - In `gameReducer.ts`, extended `RESEARCH` action to accept an array of researches (`researches: { techId: string; targetTrack?: ... }[]`) with progressive discount recalculation for 1 action disc.
    - Updated `TechMarketModal.tsx` with an interactive Hydran Double Research staging panel allowing commanders to select up to 2 technologies, choose tracks for rare technologies, and inspect progressive science discounts in real-time.
    - Includes single-click "Quick" research for individual techs and a unified "Research Selected (X 🔬, 1 Disc)" confirmation.
- [x] **Live Galactic Standings & Scoreboard (Always Visible VP Breakdown)**:
  - Created `computeCurrentScores(state: GameState)` calculating live endgame victory points at any instant:
    - Sectors (printed VP on controlled hexes)
    - Monoliths (3 VP each in controlled sectors)
    - Reputation (sum of placed reputation tiles)
    - Technologies (victory point crests on researched techs)
    - Ambassadors (1 VP each)
    - Discoveries (2 VP per kept tile & Warp Portals)
    - Species Traits (+1 VP per controlled sector for Planta, +1 VP per Ancient ship on board for Draco)
  - Created `LiveScoreboardModal.tsx` showing the complete itemized table, player rankings, crown badges, and scoring rules.
  - Added a `🏆 Standings` button and individual live `★ X VP` score indicators on every commander button in `Header.tsx`.

