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
- [ ] I still think the initive may be wrong, my crusier with Soliton Cannon, Gluon Computer, Improved Hull, Tachyon Source, Fusion Drive, Improved Hull, I don't understand how does it get +6 INT. It is also good to mark how much INT each component is providing.
- [ ] the maintainance cost is wrong, when I place all the disc, the cost should be 30 not 25. 
- [ ] We get the most things for the game rule, I now want to include all the alien factions. Their specially setup and rules are in the rulebook. Please implement and allow each player to choose the faction one by one before the game starts.
- [ ] The current map is not clear how much VP each sector offers since sometimes it can be covered by other tiles. I think the name of the tile is not important, maybe move them to the details panel but only shows the important informations on the map?
- [ ] Currently the orbeitor is implemented with the same icon on the map which is not clear, consider design a different icon for it.
