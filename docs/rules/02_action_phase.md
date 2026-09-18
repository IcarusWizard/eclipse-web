# 02. Action Phase

---

## 1. Action Phase Structure & Turn Order

1. **Clockwise Turn Order**: Starting with the player holding the Start Player marker, players take turns performing one Action or Passing.
2. **Taking an Action**:
   - Move the **leftmost available Influence Disc** from your Influence Track to the designated Action Space on your Species Board.
   - You may take as many Actions in a round as you have Influence Discs available to place.
3. **Passing**:
   - When you do not wish to (or cannot) take further main actions, you **Pass**.
   - Flip your Summary Tile to the **Reaction Overview** side.
   - **First Passer Bonus**: The first player to Pass in a round immediately collects **+2 Credits (Money)** from the supply and takes the Start Player tile for the next round.
4. **Reactions After Passing**:
   - On subsequent turns after passing, while other players continue taking actions, a passed player may choose to perform a **Reaction** instead of skipping:
     - **Upgrade Reaction**: Upgrade 1 ship part on a blueprint (paying the normal action disc cost).
     - **Build Reaction**: Build 1 ship or structure in a controlled sector.
     - **Move Reaction**: Move 1 ship up to its Drive Speed.

---

## 2. Colony Ships & Colonization

- **Activation**: At any time during your Action, you may flip a faceup Colony Ship facedown to colonize an eligible open habitat:
  - **Normal Planet Slot**: Move 1 cube from the corresponding population track (Money, Science, or Material).
  - **Advanced Planet Slot**: Requires the corresponding Advanced Tech (`advanced_economy`, `advanced_labs`, `advanced_mining`, or `metasynthesis`).
  - **Wild / Gray Slot**: Choose either Money, Science, or Material. If advanced, requires matching advanced tech.
  - **Orbital**: Choose either Money or Science (Materials cannot be placed on Orbitals).
- **Sector Requirements**: You may colonize habitats in any sector where you have an Influence Disc or in an explored sector where you just placed an Influence Disc.
- **Refresh**: Used Colony Ships remain facedown until refreshed during the **Influence Action** (up to 2 Colony Ships flipped faceup) or during the **Cleanup Phase** (all Colony Ships refreshed).

---

## 3. The 6 Main Actions

### Action 1: EXPLORE (1 Activation for Humans)
1. Choose an unexplored Zone adjacent to a sector where you have an Influence Disc or a Ship, connected via an open wormhole.
2. Draw the top Sector Tile from the corresponding Ring deck (Inner I, Middle II, or Outer III).
3. **Orientation & Legality**:
   - The tile must be placed such that at least one open wormhole connects to the exploring sector.
   - If no legal orientation exists, the tile is discarded to the bottom of the deck.
4. **Placement Options**:
   - **Keep**: Place the tile into the hex zone. You may immediately place an Influence Disc from your track into the sector if no Ancients/Guardians are present.
   - **Discard**: Discard the tile faceup to the bottom of the stack. You do not place a disc.
5. **Ancients & Guardians**: If the tile contains Ancient or Guardian symbols, place the specified number of Ancient/Guardian miniatures. Ancients guard discovery tiles and prevent taking immediate control until defeated in combat.
6. **Discovery Tiles**: If the sector has a Discovery symbol, place a facedown Discovery Tile onto the sector. If uncontested, the player may claim it immediately; if guarded, it is claimed after defeating the guardians in Combat Phase.

---

### Action 2: RESEARCH (1 Activation for Humans)
1. Pay the Science cost for an available Technology Tile from the Tech Tray.
2. **Cost Calculation**:
   $$\text{Science Paid} = \max\bigl(\text{Tech.minCost},\; \text{Tech.baseCost} - \text{TrackDiscount}\bigr)$$
   - The discount is determined by the number of previously researched technologies on that specific category track (`[0, 1, 2, 3, 4, 6, 8]`).
3. Place the tile on the leftmost empty slot of the matching track (Military, Grid, or Nano).
   - Each track holds a maximum of **7 technologies**. Once full, no more techs of that category may be researched.
   - Duplicate technologies are not allowed. Researched techs cannot be discarded.
4. **Rare Technologies**: Place in any of the 3 category tracks of the player's choice (subject to the 7-slot limit). Counts toward that row's discounts and row VP.

---

### Action 3: UPGRADE (2 Activations for Humans)
1. Each activation allows taking 1 Ship Part tile from the Upgrade Tray or supply and placing it onto an eligible blueprint slot.
2. An existing part in that slot may be returned to the Upgrade Tray.
3. **Validation Requirements**:
   - Mobile ships (Interceptor, Cruiser, Dreadnought) **must have at least one Drive**.
   - Total Energy Consumption **cannot exceed** total Energy Produced.
   - You may only use Advanced Ship Parts (e.g. Plasma Cannon, Tachyon Drive, Phase Shield) if you have researched their corresponding technology.
4. When upgraded, all ships of that type across the entire galaxy immediately receive the updated stats.

---

### Action 4: BUILD (2 Activations for Humans)
1. Spend Materials to construct ships or structures in sectors you **Control** (where you have an Influence Disc):
   - **Interceptor**: 3 Materials
   - **Cruiser**: 5 Materials
   - **Dreadnought**: 8 Materials
   - **Starbase**: 3 Materials (max 1 Starbase per sector; requires `starbase` tech)
   - **Orbital**: 4 Materials (max 1 Orbital per sector; requires `orbital` tech)
   - **Monolith**: 10 Materials (max 1 Monolith per sector; requires `monolith` tech)
2. **Fleet Supply Limits**: A player cannot build a ship if their entire miniature supply of that type is already on the board (8 Interceptors, 4 Cruisers, 2 Dreadnoughts, 4 Starbases).

---

### Action 5: MOVE (3 Activations for Humans)
1. Each Move Activation allows moving one ship a number of hex sectors up to its **Drive Speed** (printed on its equipped Drive parts, e.g. Nuclear Drive = 1, Fusion Drive = 2, Tachyon Drive = 3).
2. Ships can only traverse across **connected wormholes** (or with `wormhole_generator`).
3. **Pinning Rule**:
   - If a ship enters a sector containing enemy ships (players, Ancients, Guardians, GCDS), it must **stop immediately**—its movement activation ends.
   - For every enemy ship present in a sector, 1 of your ships is **pinned** and cannot leave the sector.
   - If you have more ships than the opponent, excess unpinned ships may continue moving out of the sector.
4. Starbases have Drive Speed 0 and cannot move.

---

### Action 6: INFLUENCE (2 Activations for Humans)
1. **Refresh Colony Ships**: Immediately flip up to **two of your used Colony Ships faceup**.
2. Each Influence Activation allows you to:
   - **Claim Control**: Move an Influence Disc from your Influence Track to an uncontrolled sector where you have a ship or that is connected via wormholes to a sector you control (no enemy ships present).
   - **Abandon Sector**: Remove an Influence Disc from a sector you control and return it to your Influence Track. **All population cubes from that sector are immediately returned to the player board tracks**.
   - Move an Influence Disc between two sectors you control.
3. You cannot use more than 1 Influence Activation on the same sector in a single action.

---

## 4. Diplomatic Relations & Ambassador Tiles (4+ Players)

- Any two players with a wormhole connection joining sectors they control may agree to establish Diplomatic Relations.
- Each player takes one of their available Ambassador Tiles and places it on the other player's Reputation Track.
- The Ambassador tile produces **+1 Resource** of the hosting player's choice each round and is worth **1 VP** at game end.
- Diplomatic relations are broken immediately if one player moves ships into a sector controlled by the other, awarding the **Traitor Tile (-2 VP)** to the aggressor.
