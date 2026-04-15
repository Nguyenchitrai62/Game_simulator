import { AdvancedDynamicTexture, Rectangle, TextBlock, Control, StackPanel, Button } from "@babylonjs/gui";


export class GameHUD {
    advancedTexture: AdvancedDynamicTexture;

    // UI Elements
    healthText!: TextBlock;
    hungerText!: TextBlock;

    constructor() {
        this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");

        this.createTopBar();
        this.createBottomBar();
    }

    createTopBar() {
        const panel = new StackPanel();
        panel.isVertical = false;
        panel.height = "50px";
        panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.advancedTexture.addControl(panel);

        const healthRect = new Rectangle();
        healthRect.width = "150px";
        healthRect.height = "40px";
        healthRect.color = "red";
        healthRect.thickness = 2;
        healthRect.background = "black";
        healthRect.paddingLeft = "10px";
        healthRect.paddingTop = "10px";
        panel.addControl(healthRect);

        this.healthText = new TextBlock();
        this.healthText.text = "HP: 100/100";
        this.healthText.color = "white";
        healthRect.addControl(this.healthText);

        const hungerRect = new Rectangle();
        hungerRect.width = "150px";
        hungerRect.height = "40px";
        hungerRect.color = "orange";
        hungerRect.thickness = 2;
        hungerRect.background = "black";
        hungerRect.paddingLeft = "10px";
        hungerRect.paddingTop = "10px";
        panel.addControl(hungerRect);

        this.hungerText = new TextBlock();
        this.hungerText.text = "Food: 100/100";
        this.hungerText.color = "white";
        hungerRect.addControl(this.hungerText);
    }

    createBottomBar() {
        const inventoryBtn = Button.CreateSimpleButton("inventoryBtn", "Inventory (B)");
        inventoryBtn.width = "150px";
        inventoryBtn.height = "40px";
        inventoryBtn.color = "white";
        inventoryBtn.background = "green";
        inventoryBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        inventoryBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        inventoryBtn.paddingLeft = "10px";
        inventoryBtn.paddingBottom = "10px";
        this.advancedTexture.addControl(inventoryBtn);

        inventoryBtn.onPointerUpObservable.add(() => {
            console.log("Open Inventory");
            // Implement inventory toggle here
        });
    }

    updateHealth(hp: number, max: number) {
        this.healthText.text = `HP: ${hp}/${max}`;
    }

    updateHunger(hunger: number, max: number) {
        this.hungerText.text = `Food: ${Math.floor(hunger)}/${max}`;
    }
}
