window.TechSystem = (function () {
    var _currentResearch = null;
    var _researchProgress = 0;

    function init() {
        var state = GameState.getTechState();
        if (state.currentResearch) {
            _currentResearch = state.currentResearch;
            _researchProgress = state.progress;
        }
    }

    function tick() {
        var libraries = GameState.getBuildingCount('building.library');
        if (libraries <= 0 || !_currentResearch) return;

        var tech = GameRegistry.getEntity(_currentResearch);
        if (!tech) {
            _currentResearch = null;
            _researchProgress = 0;
            return;
        }

        _researchProgress += libraries;

        if (_researchProgress >= tech.cost) {
            completeResearch(_currentResearch);
        }

        saveState();
    }

    function startResearch(techId) {
        var tech = GameRegistry.getEntity(techId);
        if (!tech || tech.type !== 'technology') return false;
        if (!GameState.isUnlocked(techId)) return false;
        if (GameState.hasResearched(techId)) return false;
        if (!checkPrerequisites(tech)) return false;

        _currentResearch = techId;
        _researchProgress = 0;
        saveState();
        return true;
    }

    function cancelResearch() {
        _currentResearch = null;
        _researchProgress = 0;
        saveState();
    }

    function getResearchProgress() {
        if (!_currentResearch) return null;

        var tech = GameRegistry.getEntity(_currentResearch);
        return {
            techId: _currentResearch,
            progress: _researchProgress,
            total: tech ? tech.cost : 0,
            percent: tech ? Math.min(100, (_researchProgress / tech.cost) * 100) : 0
        };
    }

    function checkPrerequisites(tech) {
        if (!tech.prerequisites) return true;

        for (var i = 0; i < tech.prerequisites.length; i++) {
            if (!GameState.hasResearched(tech.prerequisites[i])) {
                return false;
            }
        }
        return true;
    }

    function completeResearch(techId) {
        var tech = GameRegistry.getEntity(techId);
        if (!tech) return;

        GameState.addResearchedTech(techId);
        _currentResearch = null;
        _researchProgress = 0;

        if (tech.unlocks) {
            for (var i = 0; i < tech.unlocks.length; i++) {
                GameState.unlock(tech.unlocks[i]);
            }
        }

        UnlockSystem.checkAll();
        saveState();
    }

    function getAvailableTechs() {
        var entities = GameRegistry.getAllEntities();
        var available = [];

        for (var id in entities) {
            var entity = entities[id];
            if (entity.type !== 'technology') continue;
            if (!GameState.isUnlocked(id)) continue;
            if (GameState.hasResearched(id)) continue;

            available.push({
                tech: entity,
                canResearch: checkPrerequisites(entity),
                prerequisitesMet: checkPrerequisites(entity)
            });
        }

        return available;
    }

    function getCurrentResearch() {
        return _currentResearch;
    }

    function saveState() {
        GameState.setTechState({
            currentResearch: _currentResearch,
            progress: _researchProgress
        });
    }

    return {
        init: init,
        tick: tick,
        startResearch: startResearch,
        cancelResearch: cancelResearch,
        getResearchProgress: getResearchProgress,
        getAvailableTechs: getAvailableTechs,
        getCurrentResearch: getCurrentResearch,
        checkPrerequisites: checkPrerequisites
    };
})();
