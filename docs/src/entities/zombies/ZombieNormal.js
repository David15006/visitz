import { Zombie } from './Zombie.js';
import { GameConfig } from '../../config/GameConfig.js';

export class ZombieNormal extends Zombie {
  constructor(scene, x, y) {
    super(scene, x, y, 'zn_walk_0', GameConfig.ZOMBIES.NORMAL, 'normal', 'zn');
  }
}
