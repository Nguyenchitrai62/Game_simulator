import { EntityDef, BalanceDef } from "../data/types";
import { CONTENT } from "../data/content";
import { BALANCE } from "../data/balance";

export class GameRegistry {
    private entities: Map<string, EntityDef> = new Map();
    private balance: Map<string, BalanceDef> = new Map();

    init() {
        for (const entity of CONTENT) {
            this.entities.set(entity.id, entity);
        }
        for (const [id, bal] of Object.entries(BALANCE)) {
            this.balance.set(id, bal);
        }
    }

    getEntity(id: string): EntityDef | undefined {
        return this.entities.get(id);
    }

    getBalance(id: string): BalanceDef | undefined {
        return this.balance.get(id);
    }

    getEntitiesByType(type: string): EntityDef[] {
        return Array.from(this.entities.values()).filter(e => e.type === type);
    }
}
export const registry = new GameRegistry();
registry.init();
