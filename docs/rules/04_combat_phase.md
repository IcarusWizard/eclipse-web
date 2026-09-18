# 04. Combat Phase

---

## 1. Combat Phase Overview

When all players have Passed during the Action Phase, play advances to the **Combat Phase**.
The Combat Phase proceeds through the following sequence:
1. **Determine Battles**: Identify all sectors containing opposing forces.
2. **Resolve Battles**: Resolved strictly in **descending Sector Number order**.
3. **Attack Population**: Ships attack opponent population cubes in their sectors.
4. **Influence Sectors (Conquest)**: Overthrow defender influence discs if all population is eliminated; victor may claim control.
5. **Discovery Tiles**: Uncontested discovery tiles are claimed.
6. **Repair Damage**: Remove all damage cubes from all surviving ships across the galaxy.

---

## 2. Ship Battles Step-by-Step

### Step 1: Battle Resolution Order (Multi-Player Battles)
- In sectors with three or more opponents, battles are resolved between **two opponents at a time in reverse order of entry into the sector**.
- The remaining opponent with surviving ships then battles the next opponent in reverse entry order until only one player's ships remain.

### Step 2: Attacker and Defender
- **Defender**: The player **Controlling the Sector** (having their Influence Disc there) always acts as the Defender, regardless of order of entry.
- In uncontrolled sectors, the first player to enter is the Defender, and subsequent arrivals are Attackers.
- **Tie-Breaking**: All initiative ties are resolved in favor of the **Defender**.

### Step 3: Initiative Calculation
- Each ship type determines its Initiative value:
  $$\text{Initiative} = \text{Base Initiative} + \text{Drives Bonus} + \text{Computers Bonus}$$
- **Human Base Initiatives**:
  - Interceptor: **2**
  - Cruiser: **1**
  - Dreadnought: **0**
  - Starbase: **4**
- Ships activate from highest initiative to lowest initiative. Tied ships of the Defender activate before the Attacker.

---

## 3. Engagement & Combat Rounds

### A. Missile Stage (Fired Once)
- Before regular cannon fire, all ship types equipped with Missiles (e.g. Plasma Missiles, Ion Missiles) fire their missiles **once**, by ship type in initiative order.
- Roll dice equal to the missile parts (e.g. 2 Orange dice per Plasma Missile).
- Hits are allocated immediately and damage is applied. Destroyed ships are removed before regular engagement rounds begin.

### B. Engagement Rounds (Cannons)
- Combat proceeds in repeating Engagement Rounds until all ships of one side are destroyed or have retreated.
- In initiative order, each ship type fires all of its equipped non-missile Cannons:
  - **Yellow Die (Ion Cannon)**: 1 damage per hit.
  - **Orange Die (Plasma Cannon)**: 2 damage per hit.
  - **Blue Die (Antimatter Cannon)**: 4 damage per hit.
- **Roll Resolution**:
  $$\text{Modified Roll} = \text{D6 Roll} + \text{Attacker Computer Bonus} - \text{Target Shield Bonus}$$
  - **Natural 6**: Always a **Hit**, regardless of shields or computers.
  - **Natural 1**: Always a **Miss**, regardless of shields or computers.
  - **Rolls 2–5**: Hit if $\text{Modified Roll} \ge 6$.
- **Damage Allocation**:
  - The firing player assigns hit dice to target ships.
  - Damage accumulates on ships using Damage Cubes. When damage received $\ge$ total Hull (1 base HP + Hull components), the ship is destroyed.
  - Excess damage on a ship does not carry over to other ships.

### C. Tactical Retreat
- During a ship type's activation in initiative order, the player may **declare a retreat**.
- The retreating ships move to the border between the battle sector and an **adjacent friendly-controlled sector** (connected via wormholes, with no enemy ships present).
- On the ship type's activation in the **next Engagement Round**, the retreat completes and the ships safely enter the destination sector.
- **Retreat Penalty**: If all of your remaining ships attempt to retreat from a battle, you **forfeit the 1 participation Reputation Tile**, but you still draw tiles for destroyed enemy ships.

### D. Stalemate
- If neither side can damage the other (e.g. both unarmed or only armed with missiles already fired), the Attacker must retreat or their ships are destroyed.

---

## 4. Post-Battle Rewards & Clean-Up

### Reputation Tiles
After all battles in a sector are resolved, participating players draw Reputation Tiles from the 33-tile bag:
- **1 tile** for participating in battle (unless all ships attempted retreat).
- **+1 tile** for each opponent Interceptor, Starbase, or Ancient destroyed.
- **+2 tiles** for each opponent Cruiser or Guardian destroyed.
- **+3 tiles** for each opponent Dreadnought or GCDS destroyed.
- **Maximum draw**: Up to **5 tiles** per battle.
- Each player chooses **up to 1 tile** to place facedown onto their 5-slot Reputation Track (returning unchosen tiles to the bag).
- If the track is full (5 tiles), a player may replace an existing lower-value tile on their track.

### Return Destroyed Ships
Destroyed ships placed near opponent species boards are returned to their respective owners and can be built again in future rounds.

---

## 5. Attacking Population & Influence Sectors

Carried out across **all sectors** where a player has ships and opponent population or influence is present (even if no fleet battle took place, e.g. defender had 0 ships):

### Step 1: Attack Population
- Surviving ships attack opponent Population Cubes in their sector.
- Each ship may attack **once with its non-missile weapons** (Missiles cannot bombard population).
- Population Cubes have **0 Shield Value** and **1 Hull** per cube. Normal hit rules apply (modified roll $\ge 6$ or natural 6 hits).
- Each damage point inflicted destroys 1 population cube of the attacker's choosing.
- **Neutron Bombs Tech**: If the attacker has researched `neutron_bombs`, all opponent population cubes in the sector are **automatically annihilated** without rolling (unless the defender has `neutron_absorber`).
- Destroyed cubes are returned to the defender's player board tracks.

### Step 2: Influence Sectors & Conquest
- **Defender Retention**: If **ANY opponent population cube survives bombardment**, the defender **retains control** of the sector with their Influence Disc. The attacker cannot place an Influence Disc.
- **Influence Disc Overthrow**: If **0 opponent population cubes remain** in the sector:
  - The defender's Influence Disc is **overthrown** and returned to their Influence Track.
  - If the attacker has surviving ships in the sector, the attacker is prompted with **`COMBAT_CONQUEST`**:
    1. **Place Influence Disc**: The attacker may move an available Influence Disc from their track to take control of the sector.
    2. **Colonize Habitats**: If the sector is now controlled, the attacker may activate available Colony Ships to colonize open habitats.

### Step 3: Discovery Tiles
- If a player has at least one ship in a sector with an unclaimed Discovery Tile (and no hostiles remain), the player claims the tile immediately.

### Step 4: Repair Damage
- At the end of the Combat Phase, remove all damage cubes from all surviving ships across the galaxy.
- Proceed to the **Upkeep Phase**.
