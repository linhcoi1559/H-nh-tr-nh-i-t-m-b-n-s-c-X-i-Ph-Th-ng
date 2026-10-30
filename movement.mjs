export const WALK_SPEED = 2.7;
export const RUN_SPEED = 5.8;
export class CharacterMotor {
  constructor() { this.reset(); }
  reset() { this.vx = 0; this.vz = 0; this.vy = 0; this.grounded = true; this.jumpBuffer = 0; this.speed = 0; }
  jump() { this.jumpBuffer = 0.14; }
  update(position, input, yaw, dt, blocked = () => false) {
    const length = Math.hypot(input.x, input.z);
    const speed = input.run ? RUN_SPEED : WALK_SPEED;
    const x = length ? input.x / length : 0, z = length ? input.z / length : 0;
    const targetX = (x * Math.cos(yaw) + z * Math.sin(yaw)) * speed;
    const targetZ = (z * Math.cos(yaw) - x * Math.sin(yaw)) * speed;
    const blend = 1 - Math.exp(-(length ? 12 : 18) * dt);
    this.vx += (targetX - this.vx) * blend; this.vz += (targetZ - this.vz) * blend;
    if (Math.hypot(this.vx, this.vz) < 0.015) this.vx = this.vz = 0;
    if (this.jumpBuffer > 0 && this.grounded) { this.vy = 6; this.grounded = false; this.jumpBuffer = 0; }
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    if (!this.grounded) {
      position.y += this.vy * dt - 9 * dt * dt; this.vy -= 18 * dt;
      if (position.y <= 0) { position.y = 0; this.vy = 0; this.grounded = true; }
    }
    const beforeX = position.x, beforeZ = position.z;
    // Small steps prevent tunnelling through thin fences; separate axes slide along walls.
    const steps = Math.max(1, Math.ceil(Math.hypot(this.vx, this.vz) * dt / 0.12));
    for (let i = 0; i < steps; i++) {
      const nx = Math.max(-110, Math.min(95, position.x + this.vx * dt / steps));
      if (!blocked(nx, position.z, position.y)) position.x = nx; else this.vx = 0;
      const nz = Math.max(-55, Math.min(55, position.z + this.vz * dt / steps));
      if (!blocked(position.x, nz, position.y)) position.z = nz; else this.vz = 0;
    }
    this.speed = dt > 0 ? Math.hypot(position.x - beforeX, position.z - beforeZ) / dt : 0;
  }
}
