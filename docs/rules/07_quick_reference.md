# Quick Reference Tables & Cheatsheet

---

## 1. Upkeep Cost Table
The Civilization Upkeep Cost is determined by the **number of Influence Discs remaining on your Influence Track** (the highest exposed number on the track):

| Discs on Track | Discs in Use | Upkeep Cost (Credits) | Notes |
| :---: | :---: | :---: | :--- |
| **16** | 0 | **0** | Max discs on track (e.g. after Quantum Grid + Advanced Robotics) |
| **15** | 0 | **0** | |
| **14** | 0 | **0** | |
| **13** | 0 | **0** | Full standard starting track |
| **12** | 1 | **0** | Game start (1 disc placed on Home Sector) |
| **11** | 2 | **0** | 1st action taken or 2nd sector controlled |
| **10** | 3 | **1** | |
| **9** | 4 | **2** | |
| **8** | 5 | **3** | |
| **7** | 6 | **5** | |
| **6** | 7 | **7** | |
| **5** | 8 | **9** | |
| **4** | 9 | **12** | Steep upkeep tier begins |
| **3** | 10 | **15** | |
| **2** | 11 | **18** | |
| **1** | 12 | **21** | |
| **0** | 13 | **25** | All starting discs deployed |

---

## 2. Population Income Track
Each of the 3 population tracks (Money, Science, Material) contains **11 Population Cubes** covering 11 of the 12 spaces.
- **Game Setup**: 1 cube deployed to Home Sector, leaving **10 cubes on the board** (Space 3 is the starting active uncovered income).
- Income earned during Upkeep is the **highest uncovered number** on the track:

| Cubes on Board | Cubes Colonized | Active Income | Next +1 Cube Delta | Next +2 Cubes Delta |
| :---: | :---: | :---: | :---: | :---: |
| **11** | 0 | **2** | +1 (to 3) | +2 (to 4) |
| **10** | 1 (Start) | **3** | +1 (to 4) | +3 (to 6) |
| **9** | 2 | **4** | +2 (to 6) | +4 (to 8) |
| **8** | 3 | **6** | +2 (to 8) | +4 (to 10) |
| **7** | 4 | **8** | +2 (to 10) | +4 (to 12) |
| **6** | 5 | **10** | +2 (to 12) | +5 (to 15) |
| **5** | 6 | **12** | +3 (to 15) | +6 (to 18) |
| **4** | 7 | **15** | +3 (to 18) | +6 (to 21) |
| **3** | 8 | **18** | +3 (to 21) | +6 (to 24) |
| **2** | 9 | **21** | +3 (to 24) | +7 (to 28) |
| **1** | 10 | **24** | +4 (to 28) | — |
| **0** | 11 (Max) | **28** | — | — |

---

## 3. Technology Research Discount Progression
The Science discount for purchasing a technology depends strictly on the **number of previously researched technologies in that same track** (Military, Grid, or Nano):

$$\text{Actual Cost} = \max\bigl(\text{Tech.minCost},\; \text{Tech.baseCost} - \text{TrackDiscount}\bigr)$$

| Techs Already Researched in Track | Discount for Next Tech | Track Row Victory Points |
| :---: | :---: | :---: |
| **0** | **0** | 0 VP |
| **1** | **1** | 0 VP |
| **2** | **2** | 0 VP |
| **3** | **3** | 0 VP |
| **4** | **4** | **1 VP** |
| **5** | **6** | **2 VP** |
| **6** | **8** | **3 VP** |
| **7 (Max)** | — (Track Full) | **5 VP** |

*Note: Rare Technologies placed in a row count toward that track's count for discounts and row victory points.*

---

## 4. Building Costs & Supply Limits

| Item | Cost (Materials) | Max Fleet Supply per Player | Sector Limit |
| :--- | :---: | :---: | :--- |
| **Interceptor** | 3 | **8** | Unlimited |
| **Cruiser** | 5 | **4** | Unlimited |
| **Dreadnought** | 8 | **2** | Unlimited |
| **Starbase** | 3 | **4** | **Max 1 per Sector** (requires Starbase Tech) |
| **Orbital** | 4 | Miniature Supply | **Max 1 per Sector** (requires Orbital Tech) |
| **Monolith** | 10 | Miniature Supply | **Max 1 per Sector** (requires Monolith Tech) |

---

## 5. Human Ship Starting Stats

| Ship Type | Base Init | Slots | Starting Parts Layout | Start Init | Start HP | Power |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: |
| **Interceptor** | 2 | 4 | Nuclear Source, Nuclear Drive, Ion Cannon | **3** | 1 | +1 free |
| **Cruiser** | 1 | 6 | Nuclear Source, Nuclear Drive, 2x Ion Cannon, Electron Computer, Hull | **3** | 2 | 0 |
| **Dreadnought** | 0 | 8 | 2x Nuclear Source, Nuclear Drive, 2x Ion Cannon, Electron Computer, 2x Hull | **2** | 3 | +1 free |
| **Starbase** | 4 | 5 | 2x Ion Cannon, Electron Computer, Hull, (1 empty) | **5** | 2 | +3 free (internal) |

*Note: Starbases have 0 Movement (cannot move).*

---

## 6. Weapon Dice & Hit Rules

| Weapon Type | Die Color | Dice Count | Damage per Hit | Special Rules |
| :--- | :---: | :---: | :---: | :--- |
| **Ion Cannon** | Yellow | 1 | **1** | Non-missile |
| **Plasma Cannon** | Orange | 1 | **2** | Non-missile |
| **Antimatter Cannon** | Blue | 1 | **4** | Non-missile |
| **Ion Missile** | Yellow | 2 | **1** | Missile (fires once, cannot bombard) |
| **Plasma Missile** | Orange | 2 | **2** | Missile (fires once, cannot bombard) |

### Hit Formula
$$\text{Modified Roll} = \text{D6 Roll} + \text{Attacker Computer Bonus} - \text{Target Shield Bonus}$$
- **Natural 6**: Always a **Hit**, regardless of modifiers.
- **Natural 1**: Always a **Miss**, regardless of modifiers.
- **Rolls 2–5**: Hit if $\text{Modified Roll} \ge 6$.

---

## 7. Combat Phase Summary Sequence

1. **Battles Resolution Order**: Descending Sector Number (`b.sectorNumber - a.sectorNumber`).
2. **Attacker / Defender**:
   - Player controlling the sector is the **Defender** (always breaks initiative ties).
   - In uncontested sectors, reverse order of entry determines Defender.
3. **Initiative Order**: Ship Initiative = $\text{Base Initiative} + \text{Drives} + \text{Computers}$. Highest acts first; Defender breaks ties.
4. **Missile Phase**: All ships with missiles fire once in initiative order before regular combat.
5. **Engagement Rounds**: Ships fire cannons in initiative order until one side is destroyed or retreats.
6. **Reputation Tiles**: Draw up to 5 tiles ($1 \text{ for participation} + 1/2/3 \text{ per kill}$). Keep up to 1.
7. **Return Destroyed Ships**: Placed back in player supplies.
8. **Attack Population**: Victorious ships attack opponent cubes once (non-missiles vs 0 shield). Neutron Bombs auto-wipe.
9. **Influence Sectors**: Overthrow defender disc if 0 opponent cubes remain. Attacker may place disc (`pendingCombatConquest`).
10. **Claim Discovery Tiles**: Uncontested discovery tiles claimed.
11. **Repair Damage**: Clear all damage from all surviving ships across the galaxy.
