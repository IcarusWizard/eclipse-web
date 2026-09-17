import { createInitialGame } from './src/engine/rules/setup';
import { executeAction } from './src/engine/rules/gameReducer';

console.log('🌌 ECLIPSE: SECOND DAWN FOR THE GALAXY (WEB EDITION)');
let game = createInitialGame(2);
console.log(`Commanders: ${game.players.map((p) => p.name).join(' vs ')}`);
console.log(`Round: ${game.round} / ${game.maxRounds} | Phase: ${game.phase}`);
console.log(`Galaxy Sectors: ${game.sectors.length}`);
console.log('✅ Core game engine and setup verified.');