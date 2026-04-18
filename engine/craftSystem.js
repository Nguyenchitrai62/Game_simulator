window.CraftSystem = (function () {

  function getEquipmentData(equipmentId) {
    var entity = GameRegistry.getEntity(equipmentId) || {};
    var balance = GameRegistry.getBalance(equipmentId) || {};
    return {
      id: equipmentId,
      slot: entity.slot || balance.slot || null,
      stats: balance.stats || entity.stats || {}
    };
  }

  function getStatValue(stats, key) {
    return stats && stats[key] ? stats[key] : 0;
  }

  function getSlotPriority(slot) {
    if (slot === 'weapon') return ['attack', 'defense', 'maxHp', 'speed'];
    if (slot === 'offhand') return ['defense', 'maxHp', 'attack', 'speed'];
    if (slot === 'armor') return ['defense', 'maxHp', 'speed', 'attack'];
    if (slot === 'boots') return ['speed', 'defense', 'maxHp', 'attack'];
    return ['attack', 'defense', 'maxHp', 'speed'];
  }

  function isEquipmentUpgrade(newEquipmentId, equippedEquipmentId) {
    if (!newEquipmentId) return false;
    if (!equippedEquipmentId) return true;

    var nextItem = getEquipmentData(newEquipmentId);
    var currentItem = getEquipmentData(equippedEquipmentId);
    var priority = getSlotPriority(nextItem.slot);

    for (var i = 0; i < priority.length; i++) {
      var statKey = priority[i];
      var nextValue = getStatValue(nextItem.stats, statKey);
      var currentValue = getStatValue(currentItem.stats, statKey);
      if (nextValue > currentValue) return true;
      if (nextValue < currentValue) return false;
    }

    return false;
  }

  function tryAutoEquipCraftedEquipment(equipmentId) {
    var item = GameRegistry.getEntity(equipmentId);
    if (!item || item.type !== 'equipment' || !item.slot) return false;

    var player = GameState.getPlayer();
    var equippedId = player && player.equipped ? player.equipped[item.slot] : null;
    if (!equippedId || isEquipmentUpgrade(equipmentId, equippedId)) {
      return GameState.equipItem(equipmentId);
    }

    return false;
  }

  function craft(recipeId) {
    if (!GameState.isUnlocked(recipeId)) {
      if (typeof GameHUD !== 'undefined') GameHUD.showError("This recipe is locked.");
      return false;
    }

    var balance = GameRegistry.getBalance(recipeId);
    if (!balance || !balance.input || !balance.output) {
      if (typeof GameHUD !== 'undefined') GameHUD.showError("Invalid recipe.");
      return false;
    }

    // Prevent crafting duplicate equipment
    for (var resId in balance.output) {
      var item = GameRegistry.getEntity(resId);
      if (item && item.type === 'equipment') {
        var invCount = GameState.getInventoryCount(resId);
        var player = GameState.getPlayer();
        if (invCount > 0 || player.equipped[item.slot] === resId) {
          if (typeof GameHUD !== 'undefined') GameHUD.showError("You already have this equipment!");
          return false;
        }
      }
    }

    for (var resourceId in balance.input) {
      var needed = balance.input[resourceId];
      if (!GameState.hasSpendableResource(resourceId, needed)) {
        var resEntity = GameRegistry.getEntity(resourceId);
        var missing = needed - GameState.getSpendableResource(resourceId);
        if (typeof GameHUD !== 'undefined') GameHUD.showError("Not enough resources: need " + missing + " more " + (resEntity ? resEntity.name : resourceId));
        return false;
      }
    }

    for (var resourceId in balance.input) {
      var needed = balance.input[resourceId];
      GameState.consumeSpendableResource(resourceId, needed);
    }

    for (var resourceId in balance.output) {
      var produced = balance.output[resourceId];
      var item = GameRegistry.getEntity(resourceId);
      if (item && (item.type === "equipment" || item.type === "tool" || item.type === "consumable")) {
        GameState.addToInventory(resourceId, produced);
      } else {
        GameState.addResource(resourceId, produced);
      }

      if (item && item.type === 'equipment' && produced > 0) {
        tryAutoEquipCraftedEquipment(resourceId);
      }
    }

    // Check for newly unlocked content after crafting
    UnlockSystem.checkAll();
    if (typeof GameHUD !== 'undefined') GameHUD.renderAll();

    return true;
  }

  function canCraft(recipeId) {
    if (!GameState.isUnlocked(recipeId)) return false;

    var balance = GameRegistry.getBalance(recipeId);
    if (!balance || !balance.input) return false;

    for (var resourceId in balance.input) {
      var needed = balance.input[resourceId];
      if (!GameState.hasSpendableResource(resourceId, needed)) return false;
    }

    return true;
  }

  function getAvailableRecipes() {
    var recipes = GameRegistry.getEntitiesByType("recipe");
    return recipes.filter(function (recipe) {
      return GameState.isUnlocked(recipe.id);
    });
  }

  function getAllRecipes() {
    return GameRegistry.getEntitiesByType("recipe");
  }

  function getRecipeInfo(recipeId) {
    var entity = GameRegistry.getEntity(recipeId);
    var balance = GameRegistry.getBalance(recipeId);
    return {
      entity: entity,
      balance: balance,
      canCraft: canCraft(recipeId)
    };
  }

  return {
    craft: craft,
    canCraft: canCraft,
    getAvailableRecipes: getAvailableRecipes,
    getAllRecipes: getAllRecipes,
    getRecipeInfo: getRecipeInfo,
    isEquipmentUpgrade: isEquipmentUpgrade
  };
})();
