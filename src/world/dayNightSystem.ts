import { Scene, HemisphericLight, Color3 } from "@babylonjs/core";

export class DayNightSystem {
    scene: Scene;
    light: HemisphericLight;
    timeOfDay: number = 12; // Start at noon
    hoursPerSecond: number = 0.0667;

    constructor(scene: Scene, light: HemisphericLight) {
        this.scene = scene;
        this.light = light;

        this.scene.onBeforeRenderObservable.add(() => {
            this.update(this.scene.getEngine().getDeltaTime() / 1000);
        });
    }

    update(dt: number) {
        this.timeOfDay += dt * this.hoursPerSecond;
        if (this.timeOfDay >= 24) {
            this.timeOfDay -= 24;
        }

        // Simple day/night lighting interpolation
        const intensity = Math.max(0.2, Math.sin((this.timeOfDay / 24) * Math.PI * 2));
        this.light.intensity = intensity;

        // Change color based on time
        if (intensity < 0.3) {
            this.light.diffuse = new Color3(0.1, 0.2, 0.5); // Night
        } else if (intensity < 0.6) {
            this.light.diffuse = new Color3(0.8, 0.4, 0.2); // Sunset/Sunrise
        } else {
            this.light.diffuse = new Color3(1, 1, 1); // Day
        }
    }
}
