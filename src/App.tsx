import React, { useState } from 'react';
import { GameState } from './engine/types/state';
import { SectorTile, HexCoord, ShipType } from './engine/types/galaxy';
import { ShipPart } from './engine/types/blueprints';
import { createInitialGame } from './engine/rules/setup';
import { executeAction } from './engine/rules/gameReducer';
import { getRingFromCoord } from './engine/rules/hexMath';

// UI Components
import { Header } from './components/layout/Header';
import { HexGalaxyMap } from './components/map/HexGalaxyMap';
import { PlayerBoard } from './components/dashboard/PlayerBoard';
import { ActionBar } from './components/layout/ActionBar';
import { GameLogDrawer } from './components/layout/GameLogDrawer';
import { ShipBlueprintEditor } from './components/blueprints/ShipBlueprintEditor';
import { TechMarketModal } from './components/tech/TechMarketModal';
import { ExploreModal } from './components/actions/ExploreModal';
import { BuildModal } from './components/actions/BuildModal';
import { MoveModal } from './components/actions/MoveModal';
import { TradeModal } from './components/actions/TradeModal';
import { CombatModal } from './components/combat/CombatModal';
import { GameOverModal } from './components/gameover/GameOverModal';
import { NewGameModal } from './components/setup/NewGameModal';
import { DiscoveryChoiceModal } from './components/discovery/DiscoveryChoiceModal';
import { SectorInspector } from './components/map/SectorInspector';

export const App: React.FC = () => {
  const [state, setState] = useState<GameState>(() => createInitialGame(2));
  const [selectedSector, setSelectedSector] = useState<SectorTile | null>(null);
  const [selectedViewIndex, setSelectedViewIndex] = useState<number>(0);

  // Modal visibility states
  const [isExploreMode, setIsExploreMode] = useState<boolean>(false);
  const [pendingExploreCoords, setPendingExploreCoords] = useState<{
    from: HexCoord;
    target: HexCoord;
  } | null>(null);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState<boolean>(false);
  const [isTechMarketOpen, setIsTechMarketOpen] = useState<boolean>(false);
  const [isBuildOpen, setIsBuildOpen] = useState<boolean>(false);
  const [isMoveOpen, setIsMoveOpen] = useState<boolean>(false);
  const [isTradeOpen, setIsTradeOpen] = useState<boolean>(false);
  const [isNewGameOpen, setIsNewGameOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activePlayer = state.players[state.activePlayerIndex]!;
  const viewedPlayer = state.players[selectedViewIndex] || activePlayer;

  const showToast = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  const handleStartNewGame = (playerCount: number) => {
    const newGame = createInitialGame(playerCount);
    setState(newGame);
    setSelectedViewIndex(0);
    setSelectedSector(null);
    setIsNewGameOpen(false);
  };

  // Explore flow: User clicks an explorable hex on map
  const handleExploreTarget = (fromCoord: HexCoord, targetCoord: HexCoord) => {
    setPendingExploreCoords({ from: fromCoord, target: targetCoord });
    setIsExploreMode(false);
  };

  const handleConfirmExplorePlacement = (rotation: number, claimInfluence: boolean) => {
    if (!pendingExploreCoords) return;
    const res = executeAction(state, {
      type: 'EXPLORE',
      playerId: activePlayer.id,
      fromCoord: pendingExploreCoords.from,
      targetCoord: pendingExploreCoords.target,
      rotation,
      claimInfluence,
    });

    if (res.success) {
      setState(res.newState);
      setPendingExploreCoords(null);
      // Synchronize viewed player to new active player if turn passed
      setSelectedViewIndex(res.newState.activePlayerIndex);
    } else {
      showToast(res.error || 'Exploration failed.');
    }
  };

  const handleDiscardExploreTile = () => {
    if (!pendingExploreCoords) return;
    const res = executeAction(state, {
      type: 'EXPLORE',
      playerId: activePlayer.id,
      fromCoord: pendingExploreCoords.from,
      targetCoord: pendingExploreCoords.target,
      rotation: 0,
      discard: true,
    });
    if (res.success) {
      setState(res.newState);
      setPendingExploreCoords(null);
      setSelectedViewIndex(res.newState.activePlayerIndex);
    }
  };

  // Research flow
  const handleResearchTech = (techId: string, targetTrack?: 'military' | 'grid' | 'nano') => {
    const res = executeAction(state, {
      type: 'RESEARCH',
      playerId: activePlayer.id,
      techId,
      targetTrack,
    });
    if (res.success) {
      setState(res.newState);
      setIsTechMarketOpen(false);
      setSelectedViewIndex(res.newState.activePlayerIndex);
    } else {
      showToast(res.error || 'Failed to research technology.');
    }
  };

  // Blueprint save flow
  const handleSaveBlueprint = (shipType: ShipType, newSlots: (ShipPart | null)[]) => {
    const upgrades = newSlots.map((part, slotIndex) => ({
      shipType,
      slotIndex,
      partId: part?.id || null,
    }));

    const res = executeAction(state, {
      type: 'UPGRADE',
      playerId: activePlayer.id,
      upgrades,
    });

    if (res.success) {
      setState(res.newState);
      setIsBlueprintOpen(false);
      setSelectedViewIndex(res.newState.activePlayerIndex);
    } else {
      showToast(res.error || 'Failed to save blueprint.');
    }
  };

  // Build flow
  const handleBuild = (items: { sectorId: string; itemType: ShipType | 'orbital' | 'monolith' }[]) => {
    const res = executeAction(state, {
      type: 'BUILD',
      playerId: activePlayer.id,
      items,
    });
    if (res.success) {
      setState(res.newState);
      setIsBuildOpen(false);
      setSelectedViewIndex(res.newState.activePlayerIndex);
    } else {
      showToast(res.error || 'Construction failed.');
    }
  };

  // Move flow
  const handleMove = (moves: { shipId: string; fromSectorId: string; toSectorId: string }[]) => {
    const res = executeAction(state, {
      type: 'MOVE',
      playerId: activePlayer.id,
      moves,
    });
    if (res.success) {
      setState(res.newState);
      setIsMoveOpen(false);
      setSelectedViewIndex(res.newState.activePlayerIndex);
    } else {
      showToast(res.error || 'Movement maneuver failed.');
    }
  };

  // Colonize planet flow
  const handleColonizePlanet = (sectorId: string, planetIndex: number) => {
    const res = executeAction(state, {
      type: 'COLONIZE',
      playerId: activePlayer.id,
      sectorId,
      planetIndex,
    });
    if (res.success) {
      setState(res.newState);
    } else {
      showToast(res.error || 'Colonization failed.');
    }
  };

  // Trade flow
  const handleTrade = (fromResource: 'science' | 'material', amount: number) => {
    const res = executeAction(state, {
      type: 'TRADE',
      playerId: activePlayer.id,
      fromResource,
      amount,
    });
    if (res.success) {
      setState(res.newState);
      setIsTradeOpen(false);
    } else {
      showToast(res.error || 'Trade failed.');
    }
  };

  // Pass turn
  const handlePass = () => {
    const res = executeAction(state, {
      type: 'PASS',
      playerId: activePlayer.id,
    });
    if (res.success) {
      setState(res.newState);
      setSelectedViewIndex(res.newState.activePlayerIndex);
    } else {
      showToast(res.error || 'Failed to pass turn.');
    }
  };

  // Discovery choice flow
  const handleDiscoveryChoice = (keepForVictoryPoints: boolean) => {
    if (!state.pendingDiscovery) return;
    const res = executeAction(state, {
      type: 'DISCOVERY_CHOICE',
      playerId: state.pendingDiscovery.playerId,
      sectorId: state.pendingDiscovery.sectorId,
      keepForVictoryPoints,
    });
    if (res.success) {
      setState(res.newState);
    } else {
      showToast(res.error || 'Failed to claim discovery.');
    }
  };

  // Step Combat
  const handleStepCombat = () => {
    if (!state.activeCombat) return;
    const res = executeAction(state, {
      type: 'RESOLVE_COMBAT_STEP',
      playerId: activePlayer.id,
      sectorId: state.activeCombat.sectorId,
    });
    if (res.success) {
      setState(res.newState);
      if (!res.newState.activeCombat) {
        showToast('Combat engagement concluded.');
      }
    }
  };

  // Auto-Resolve Combat
  const handleAutoResolveCombat = () => {
    if (!state.activeCombat) return;
    let currentState = state;
    let iterations = 0;
    while (currentState.activeCombat && iterations < 100) {
      iterations++;
      const res = executeAction(currentState, {
        type: 'RESOLVE_COMBAT_STEP',
        playerId: activePlayer.id,
        sectorId: currentState.activeCombat.sectorId,
      });
      if (!res.success) break;
      currentState = res.newState;
    }
    setState(currentState);
    showToast('Combat engagement auto-resolved.');
  };

  // Find candidate tile for exploration preview if pending
  const candidateTile = React.useMemo(() => {
    if (!pendingExploreCoords) return null;
    const ring = getRingFromCoord(pendingExploreCoords.target);
    const deck =
      ring === 1
        ? state.sectorDecks.ring1
        : ring === 2
        ? state.sectorDecks.ring2
        : state.sectorDecks.ring3;
    return deck[deck.length - 1] || null;
  }, [pendingExploreCoords, state.sectorDecks]);

  const sourceSector = React.useMemo(() => {
    if (!pendingExploreCoords) return null;
    return state.sectors.find(
      (s) =>
        s.coord.q === pendingExploreCoords.from.q &&
        s.coord.r === pendingExploreCoords.from.r
    ) || null;
  }, [pendingExploreCoords, state.sectors]);

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Header */}
      <Header
        state={state}
        selectedViewIndex={selectedViewIndex}
        onSelectActiveViewPlayer={(idx) => setSelectedViewIndex(idx)}
        onNewGame={() => setIsNewGameOpen(true)}
        onOpenTechTray={() => setIsTechMarketOpen(true)}
      />

      {/* Main Playing Area */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Galaxy Hex Map */}
        <HexGalaxyMap
          state={state}
          selectedSectorId={selectedSector?.id || null}
          onSelectSector={(s) => setSelectedSector(s)}
          isExploreMode={isExploreMode}
          onExploreTarget={handleExploreTarget}
          onColonizePlanet={handleColonizePlanet}
        />

        {/* Floating Player Dashboard (Bottom-Left) */}
        <div className="absolute top-4 left-4 z-20 w-80 max-w-[calc(100vw-32px)] pointer-events-auto">
          <PlayerBoard
            player={viewedPlayer}
            isActive={viewedPlayer.id === activePlayer.id}
            onOpenBlueprints={() => setIsBlueprintOpen(true)}
            onOpenTechMarket={() => setIsTechMarketOpen(true)}
            onOpenTrade={() => setIsTradeOpen(true)}
          />
        </div>

        {/* Floating Sector Detail & Fleet Inspector (Top-Right) */}
        {selectedSector && (
          <div className="absolute top-4 right-4 z-20 pointer-events-auto">
            <SectorInspector
              sector={state.sectors.find((s) => s.id === selectedSector.id) || selectedSector}
              players={state.players}
              activePlayer={activePlayer}
              onColonizePlanet={handleColonizePlanet}
              onClose={() => setSelectedSector(null)}
            />
          </div>
        )}

        {/* Action Bar (Bottom-Center) */}
        {state.phase === 'ACTION_PHASE' && (
          <ActionBar
            activePlayer={activePlayer}
            isExploreMode={isExploreMode}
            onToggleExplore={() => setIsExploreMode((prev) => !prev)}
            onOpenResearch={() => setIsTechMarketOpen(true)}
            onOpenUpgrade={() => setIsBlueprintOpen(true)}
            onOpenBuild={() => setIsBuildOpen(true)}
            onOpenMove={() => setIsMoveOpen(true)}
            onPass={handlePass}
          />
        )}

        {/* Game Event Log Drawer (Bottom-Right) */}
        <GameLogDrawer logs={state.log} />

        {/* Error Toast Notification */}
        {errorMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-2xl animate-bounce">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Modals */}
      {pendingExploreCoords && candidateTile && sourceSector && (
        <ExploreModal
          player={activePlayer}
          fromCoord={pendingExploreCoords.from}
          targetCoord={pendingExploreCoords.target}
          candidateTile={candidateTile}
          sourceSector={sourceSector}
          onConfirmPlacement={handleConfirmExplorePlacement}
          onDiscard={handleDiscardExploreTile}
          onClose={() => setPendingExploreCoords(null)}
        />
      )}

      {isBlueprintOpen && (
        <ShipBlueprintEditor
          player={viewedPlayer}
          onSaveBlueprint={handleSaveBlueprint}
          onClose={() => setIsBlueprintOpen(false)}
        />
      )}

      {isTechMarketOpen && (
        <TechMarketModal
          player={viewedPlayer}
          activePlayer={activePlayer}
          techSupply={state.techSupply}
          techBagCount={state.techBag.length}
          onResearchTech={handleResearchTech}
          onClose={() => setIsTechMarketOpen(false)}
        />
      )}

      {isBuildOpen && (
        <BuildModal
          player={activePlayer}
          sectors={state.sectors}
          onBuild={handleBuild}
          onClose={() => setIsBuildOpen(false)}
        />
      )}

      {isMoveOpen && (
        <MoveModal
          player={activePlayer}
          sectors={state.sectors}
          onMove={handleMove}
          onClose={() => setIsMoveOpen(false)}
        />
      )}

      {isTradeOpen && (
        <TradeModal
          player={viewedPlayer}
          onTrade={handleTrade}
          onClose={() => setIsTradeOpen(false)}
        />
      )}

      {state.activeCombat && (
        <CombatModal
          state={state}
          combat={state.activeCombat}
          onStepCombat={handleStepCombat}
          onAutoResolve={handleAutoResolveCombat}
        />
      )}

      {state.pendingDiscovery && (
        <DiscoveryChoiceModal
          discovery={state.pendingDiscovery.discovery}
          player={
            state.players.find((p) => p.id === state.pendingDiscovery!.playerId) ||
            activePlayer
          }
          onChoice={handleDiscoveryChoice}
        />
      )}

      {state.phase === 'GAME_OVER' && (
        <GameOverModal
          state={state}
          onNewGame={() => setIsNewGameOpen(true)}
        />
      )}

      {isNewGameOpen && (
        <NewGameModal
          onStartGame={handleStartNewGame}
          onClose={() => setIsNewGameOpen(false)}
        />
      )}
    </div>
  );
};
