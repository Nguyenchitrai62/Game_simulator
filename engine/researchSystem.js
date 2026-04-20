/**
 * researchSystem.js
 * Manages technology research mechanics (global upgrades)
 */

window.ResearchSystem = (function() {
  "use strict";

  /**
   * Check if can research a technology
   * @param {string} techId - Technology ID (e.g., "tech.advanced_tools")
   * @returns {boolean}
   */
  function canResearch(techId) {
    if (!GameState.isUnlocked(techId)) return false;
    if (isResearched(techId)) return false;

    var balance = GameRegistry.getBalance(techId);
    if (!balance || !balance.researchCost) return false;

    // Check prerequisites
    if (balance.requires) {
      for (var i = 0; i < balance.requires.length; i++) {
        if (!isResearched(balance.requires[i])) {
          return false;
        }
      }
    }

    // Check resource cost
    for (var resId in balance.researchCost) {
      if (!GameState.hasSpendableResource(resId, balance.researchCost[resId])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Research a technology
   * @param {string} techId
   * @returns {boolean} success
   */
  function research(techId) {
    if (!canResearch(techId)) return false;

    var balance = GameRegistry.getBalance(techId);
    
    // Deduct cost
    for (var resId in balance.researchCost) {
      GameState.consumeSpendableResource(resId, balance.researchCost[resId]);
    }

    // Mark researched
    GameState.markResearched(techId);
    
    console.log('[ResearchSystem] Researched:', techId);
    return true;
  }

  /**
   * Check if technology is researched
   */
  function isResearched(techId) {
    return GameState.isResearched(techId);
  }

  /**
   * Get all global bonuses from researched technologies
   * @returns {object} - { productionBonus, harvestSpeedBonus, npcSpeedBonus, troopDamageFlatBonus, ... }
   */
  function getGlobalBonuses() {
    var bonuses = {
      productionBonus: 0,
      harvestSpeedBonus: 0,
      npcSpeedBonus: 0,
      storageBonus: 0,
      troopDamageFlatBonus: 0,
      troopMoveSpeedBonus: 0,
      troopAttackSpeedBonus: 0,
      barracksTrainingSpeedBonus: 0
    };

    var researched = GameState.getResearched();
    
    researched.forEach(function(techId) {
      var balance = GameRegistry.getBalance(techId);
      if (!balance || !balance.effects) return;

      // Accumulate bonuses
      if (balance.effects.productionBonus) {
        bonuses.productionBonus += balance.effects.productionBonus;
      }
      if (balance.effects.harvestSpeedBonus) {
        bonuses.harvestSpeedBonus += balance.effects.harvestSpeedBonus;
      }
      if (balance.effects.npcSpeedBonus) {
        bonuses.npcSpeedBonus += balance.effects.npcSpeedBonus;
      }
      if (balance.effects.storageBonus) {
        bonuses.storageBonus += balance.effects.storageBonus;
      }
      if (balance.effects.troopDamageFlatBonus) {
        bonuses.troopDamageFlatBonus += balance.effects.troopDamageFlatBonus;
      }
      if (balance.effects.troopMoveSpeedBonus) {
        bonuses.troopMoveSpeedBonus += balance.effects.troopMoveSpeedBonus;
      }
      if (balance.effects.troopAttackSpeedBonus) {
        bonuses.troopAttackSpeedBonus += balance.effects.troopAttackSpeedBonus;
      }
      if (balance.effects.barracksTrainingSpeedBonus) {
        bonuses.barracksTrainingSpeedBonus += balance.effects.barracksTrainingSpeedBonus;
      }
    });

    return bonuses;
  }

  /**
   * Get all available technologies (unlocked but not researched) grouped by tier
   */
  function getAvailableTechnologies() {
    var allTechs = GameRegistry.getEntitiesByType('technology');
    var available = [];

    allTechs.forEach(function(tech) {
      if (GameState.isUnlocked(tech.id) && !isResearched(tech.id)) {
        available.push(tech);
      }
    });

    return available;
  }

  return {
    canResearch: canResearch,
    research: research,
    isResearched: isResearched,
    getGlobalBonuses: getGlobalBonuses,
    getAvailableTechnologies: getAvailableTechnologies
  };
})();
