window.GamePreview = (function () {

  function preview(packData, balancePatch) {
    var container = document.getElementById("preview-panel");
    if (!container) {
      container = document.createElement("div");
      container.id = "preview-panel";
      container.style.cssText = "position:fixed;bottom:0;left:0;right:0;background:#1a1a2e;border-top:2px solid #e94560;padding:15px;z-index:999;max-height:40vh;overflow-y:auto;";
      document.body.appendChild(container);
    }

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
    html += '<h3 style="color:#e94560;margin:0">Content Preview: ' + escapeHtml(packData.name || packData.packId) + '</h3>';
    html += '<div>';
    html += '<button class="btn" style="background:#4ecca3;color:#1a1a2e;margin-right:5px" onclick="GamePreview.applyPreview()">Apply</button>';
    html += '<button class="btn" style="background:#e94560" onclick="GamePreview.closePreview()">Close</button>';
    html += '</div></div>';

    if (packData.entities && packData.entities.length > 0) {
      html += '<div style="margin-bottom:10px"><strong>Entities (' + packData.entities.length + '):</strong></div>';
      packData.entities.forEach(function (entity) {
        html += '<div style="background:#16213e;padding:6px 10px;margin:4px 0;border-radius:4px;font-size:13px">';
        html += '<span style="color:#e94560">[' + entity.type + ']</span> ';
        html += '<span style="color:#4ecca3">' + escapeHtml(entity.id) + '</span> - ';
        html += escapeHtml(entity.name);
        html += '</div>';
      });
    }

    if (balancePatch) {
      var balanceCount = Object.keys(balancePatch).length;
      html += '<div style="margin:10px 0"><strong>Balance Entries (' + balanceCount + '):</strong></div>';
      for (var id in balancePatch) {
        html += '<div style="background:#16213e;padding:6px 10px;margin:4px 0;border-radius:4px;font-size:12px">';
        html += '<span style="color:#e94560">' + escapeHtml(id) + '</span>: ';
        html += '<span style="color:#888">' + escapeHtml(JSON.stringify(balancePatch[id])) + '</span>';
        html += '</div>';
      }
    }

    container.innerHTML = html;

    window._previewPack = packData;
    window._previewBalance = balancePatch;
  }

  function applyPreview() {
    if (!window._previewPack || !window._previewBalance) return;

    if (!confirm("Apply this generated content to the game? (Temporary - will not persist after reload)")) return;

    GameGenerator.applyGeneratedContent(window._previewPack, window._previewBalance);

    var validation = GameValidator.validateAll();
    if (!validation.valid) {
      console.warn("[Preview] Validation errors after apply:");
      validation.errors.forEach(function (e) { console.warn("  " + e); });
    }

    closePreview();
    GameHUD.showNotification("Content applied (temporary)!");
  }

  function closePreview() {
    var container = document.getElementById("preview-panel");
    if (container) {
      container.remove();
    }
    window._previewPack = null;
    window._previewBalance = null;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  return {
    preview: preview,
    applyPreview: applyPreview,
    closePreview: closePreview
  };
})();
