# 05. Upkeep, Cleanup & Scoring

---

## 1. Upkeep Phase

During the Upkeep Phase, players use their income to pay Civilization Upkeep, manage their budget, and produce Science and Materials.

### Step 1: Colony Ships Activation
- Players may activate any remaining unused Colony Ships to colonize open habitats in their controlled sectors.
- **Upkeep Restriction**: Unlike the Action Phase, Colony Ships **are not allowed** to be used during Upkeep to move population cubes to sectors containing opponent ships.

### Step 2: Civilization Upkeep & Money Income
1. Determine **Money Income**: The highest exposed number on your Money Population Track (range: 2 to 28).
2. Determine **Civilization Upkeep Cost**: The highest exposed number on your Influence Track based on the number of discs remaining on the track:
   - 16–11 discs remaining: **0 Upkeep**
   - 10 discs: **1 Upkeep**
   - 9 discs: **2 Upkeep**
   - 8 discs: **3 Upkeep**
   - 7 discs: **5 Upkeep**
   - 6 discs: **7 Upkeep**
   - 5 discs: **9 Upkeep**
   - 4 discs: **12 Upkeep**
   - 3 discs: **15 Upkeep**
   - 2 discs: **18 Upkeep**
   - 1 disc: **21 Upkeep**
   - 0 discs: **25 Upkeep**
3. **Net Money Calculation**:
   $$\text{Net Delta} = \text{Money Income} - \text{Civilization Upkeep}$$
   - If positive, advance the Money Storage Marker by the net gain.
   - If negative, decrease the Money Storage Marker by the net loss.

### Step 3: Bankruptcy Procedure & Civilization Collapse
At no time may your Money storage drop below 0. If a player owes more upkeep than they have Money in storage, they must resolve the deficit through the official bankruptcy procedure:
1. **Emergency Trading**:
   - Trade Materials for Money at the faction's trade ratio (2:1 for Humans; 2 Materials $\to$ 1 Credit).
   - If still in deficit, trade Science for Money (2 Science $\to$ 1 Credit).
2. **Abandoning Controlled Sectors**:
   - If emergency trading cannot cover the deficit, the player must systematically **abandon controlled non-home sectors** one by one:
     - Remove the sector's Influence Disc and return it to the Influence Track (which immediately lowers the Civilization Upkeep cost).
     - Return **all Population Cubes** from that sector to their respective player board tracks.
3. **Home Sector Abandonment**:
   - If the player runs out of non-home sectors and remains in deficit, they must abandon their Home Sector.
4. **Civilization Collapse (Elimination)**:
   - If the budget deficit cannot be balanced even after exhausting all assets, the player's civilization collapses:
     - The player is eliminated (`isEliminated: true`).
     - All remaining ships of the player are removed from the board.
     - The player takes no further actions for the remainder of the game.

### Step 4: Producing Science & Materials
- Produce Science equal to the highest uncovered number on the Science Population Track.
- Produce Materials equal to the highest uncovered number on the Material Population Track.
- Advance the corresponding Storage Markers on the Storage Track.

---

## 2. Cleanup Phase

1. **Retrieve Action Discs**:
   - Move all Influence Discs placed on the **Action Track** back to the player's **Influence Track**.
   - Influence Discs placed on **Sectors remain on the sectors**.
2. **Refresh Colony Ships**:
   - Flip all used Colony Ships faceup (ready for the next round).
3. **Replenish Tech Supply**:
   - Draw tiles from the white Tech Bag until **$\text{Player Count} + 3$ regular tiles** have been drawn:
     - 2 Players: 5 regular tiles
     - 3 Players: 6 regular tiles
     - 4 Players: 7 regular tiles
     - 5 Players: 8 regular tiles
     - 6 Players: 9 regular tiles
   - Any drawn **Rare Tech tiles do not count** toward this limit; they are placed in open rare slots on the bottom row of the Tech Tray.
4. **First Player Determination**:
   - The first player to have Passed in the previous round takes the Start Player marker and becomes the first active player.
5. **Advance Round Marker**:
   - Advance the Round Marker one step on the Tech Tray track.
   - The game consists of **8 Rounds**. If Round 8 concludes, advance to **Final Scoring**.

---

## 3. Final Victory Point (VP) Scoring

At the end of Round 8, players tally Victory Points across 7 categories:

| Category | VP Value | Description |
| :--- | :---: | :--- |
| **Controlled Sectors** | Variable | Printed VP value on each sector where the player has an Influence Disc (e.g. Galactic Center = 4 VP). |
| **Monoliths** | **2 VP each** | Built Monoliths located in sectors controlled by the player at game end. |
| **Reputation Tiles** | **1–4 VP each** | Sum of all faceup Reputation Tiles on the player's 5-slot Reputation Track. |
| **Technology Tiles (Printed)** | **1–3 VP** | Printed VP on certain advanced and rare technologies (e.g. Advanced Military = 1 VP, Monolith = 3 VP). |
| **Technology Row Bonuses** | **1–5 VP per row** | Based on total tiles researched in each track (Military, Grid, Nano):<br>• 4 Techs: **1 VP**<br>• 5 Techs: **2 VP**<br>• 6 Techs: **3 VP**<br>• 7 Techs: **5 VP** |
| **Kept Discovery Tiles** | **2 VP each** | Discovery tiles that the player chose to keep facedown on their board rather than claiming immediate rewards. |
| **Ambassador Tiles** | **1 VP each** | Ambassador tiles on your track from active Diplomatic Relations. |
| **Traitor Tile Penalty** | **-2 VP** | Penalty held by a player who broke Diplomatic Relations. |
| **Species Bonus VP** | Variable | Special VP bonuses (e.g. Planta: +1 VP per controlled sector). |

### Tie-Breaker
In case of a tie in total Victory Points, the tie is broken by the **total remaining resources** (Money + Science + Materials) in storage.
