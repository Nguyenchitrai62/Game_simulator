window.CraftSystem = (function () {

  function craft(recipeId) {
    if (!canCraft(recipeId)) return false;

    var balance = GameRegistry.getBalance(recipeId);
    if (!balance || !balance.input || !balance.output) return false;

    for (var resourceId in balance.input) {
      var needed = balance.input[resourceId];
      GameState.removeResource(resourceId, needed);
    }

    for (var resourceId in balance.output) {
      var produced = balance.output[resourceId];
      var item = GameRegistry.getEntity(resourceId);
      if (item && (item.type === "equipment" || item.type === "tool" || item.type === "consumable")) {
        GameState.addToInventory(resourceId, produced);
      } else {
        GameState.addResource(resourceId, produced);
      }
    }

    return true;
  }

  function canCraft(recipeId) {
    if (!GameState.isUnlocked(recipeId)) return false;

    var balance = GameRegistry.getBalance(recipeId);
    if (!balance || !balance.input) return false;

    for (var resourceId in balance.input) {
      var needed = balance.input[resourceId];
      if (!GameState.hasResource(resourceId, needed)) return false;
    }

    return true;
  }

  function getAvailableRecipes() {
    var recipes = GameRegistry.getEntitiesByType("recipe");
    return recipes.filter(function (recipe) {
      return GameState.isUnlocked(recipe.id);
    });
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
    getRecipeInfo: getRecipeInfo
  };
})();
