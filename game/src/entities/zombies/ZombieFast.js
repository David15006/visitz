import { Zombie } from './Zombie.js';
import { GameConfig } from '../../config/GameConfig.js';

export class ZombieFast extends Zombie {
  constructor(scene, x, y) {
    super(scene, x, y, 'zf_walk_0', GameConfig.ZOMBIES.FAST, 'fast', 'zf');
  }
}
