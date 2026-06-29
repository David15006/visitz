import { Zombie } from './Zombie.js';
import { GameConfig } from '../../config/GameConfig.js';

export class ZombieTank extends Zombie {
  constructor(scene, x, y) {
    super(scene, x, y, 'zt_walk_0', GameConfig.ZOMBIES.TANK, 'tank', 'zt');
    this.setScale(1.3);
  }
}
