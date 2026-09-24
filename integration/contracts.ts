/** Design-only contracts. Nothing in room-preview imports this directory. */
export type Vec3 = readonly [number, number, number];
export type SemVer = `${number}.${number}.${number}`;
export type SceneId = 'room' | 'school' | 'concert';
export interface LicenseRecord {
  status: 'reviewed' | 'project-owned' | 'pending' | 'restricted';
  identifier: string; author: string; source: string; originalURL?: string;
  attribution: string; attributionRequired: boolean;
  permittedUses: readonly ('preview' | 'redistribution' | 'adaptation' | 'commercial')[];
  evidencePath: string; reviewedAt: string;
}
export interface AssetRecord {
  id: string; uri: string; sha256: string; bytes: number;
  format: 'glb' | 'gltf' | 'png' | 'webp' | 'wav' | 'webm' | 'midi' | 'musicxml' | 'procedural-js' | 'javascript' | 'html' | 'css' | 'text';
  license: LicenseRecord; required: boolean; compression: string;
  dependencies: readonly string[]; clips?: readonly string[];
  maxTextureDimension?: number; lod?: readonly { distanceMetres: number; assetId: string }[];
}
export interface AssetManifest {
  schemaVersion: 1; sceneId: SceneId; version: SemVer;
  coordinates: { units: 'metres'; up: '+Y'; forward: '+Z'; handedness: 'right' };
  runtime: { family: 'three' | 'dom'; requiredRevision: string; ownsRenderer: boolean };
  assets: readonly AssetRecord[];
}
export interface SpawnPoint { id: string; position: Vec3; yawRadians: number; clearanceMetres: number; surface: 'land' | 'interior'; }
export interface ExitPoint { id: string; position: Vec3; targetScene: SceneId; targetSpawnId: string; requiresConfirmation: boolean; }
export interface Interactable { id: string; label: string; activityId?: string; enabled: boolean; }
export interface PlayerContext {
  playerId: string; currentScene: SceneId; cameraMode: 'overview' | 'activity';
  /** Display snapshot only. Client-side points never authorize a reward. */
  points: number; unlockedActivities: readonly string[]; saveVersion: number;
}
export interface SceneContext {
  hostVersion: SemVer; player: Readonly<PlayerContext>; signal: AbortSignal;
  /** Host-owned adapter, not a bundled second copy of THREE. */
  engine: { family: 'three' | 'dom'; revision: string; adapter: unknown };
  entry: SpawnPoint; emit(event: IntegrationEvent): void;
  requestExit(exitId: string): Promise<void>;
}
export interface SceneModule {
  id: SceneId; displayName: string; version: SemVer; assetManifest: AssetManifest;
  mount(sceneContext: SceneContext): Promise<void>;
  /** Idempotent: unregister events, abort work, release leases and audio, detach roots. */
  unmount(): Promise<void>;
  getSpawnPoints(): readonly SpawnPoint[];
  getExitPoints(): readonly ExitPoint[];
  getInteractables(): readonly Interactable[];
}
export type ActivityCategory = 'learning' | 'music' | 'coffee' | 'lake' | 'snow';
export interface ActivityContext { attemptId: string; player: Readonly<PlayerContext>; signal: AbortSignal; seed: number; input: unknown; emit(event: IntegrationEvent): void; }
export interface Score { policyVersion: SemVer; dimensions: Readonly<Record<string, number>>; normalized: number | null; evidenceIds: readonly string[]; }
export interface Reward { id: string; kind: 'points' | 'unlock' | 'badge'; amount?: number; targetId?: string; status: 'proposed' | 'granted' | 'rejected'; }
export interface ActivityResult { attemptId: string; activityId: string; outcome: 'completed' | 'cancelled' | 'failed'; score: Score | null; evidenceIds: readonly string[]; durationSeconds: number; }
export interface ActivityModule {
  id: string; category: ActivityCategory;
  start(context: ActivityContext): Promise<void>;
  update(deltaTime: number): void;
  /** Exactly one terminal result per attempt; duplicate completion is idempotent. */
  complete(result: ActivityResult): Promise<void>;
  getScore(): Score | null;
  getRewards(): readonly Reward[];
  getProgress(): { stage: string; fraction: number; resumable: boolean };
}
export interface EventEnvelope<T extends string, P> {
  protocolVersion: 1; eventId: string; type: T; occurredAt: string;
  source: SceneId; playerId: string; attemptId?: string; payload: P;
}
export type IntegrationEvent =
  | EventEnvelope<'scene.ready', { transitionId: string; sceneVersion: SemVer; spawnId: string }>
  | EventEnvelope<'scene.exit-requested', { transitionId: string; exitId: string; target: SceneId }>
  | EventEnvelope<'activity.completed', ActivityResult>
  | EventEnvelope<'learning.evidence-recorded', { domain: string; evidenceId: string; skill: string }>
  | EventEnvelope<'points.granted', { ledgerId: string; ledgerRevision: number; delta: number; balance: number; policyVersion: SemVer }>
  | EventEnvelope<'reward.granted', { ledgerId: string; ledgerRevision: number; reward: Reward }>
  | EventEnvelope<'integration.failed', IntegrationError>;
export interface TransitionRequest { protocolVersion: 1; transitionId: string; from: SceneId; to: SceneId; exitId: string; spawnId: string; expectedSceneMajor: number; returnToId: string; }
export interface HandoffTicket {
  /** Opaque one-use code, exchanged by the destination backend; never a player ID or points claim. */
  code: string; expiresAt: string; targetOrigin: string; transitionId: string; state: string;
}
export interface ResultReceipt { receiptId: string; attemptId: string; acceptedAt: string; ledgerVersion: number; resultDigest: string; }
export interface SaveEnvelope<T = unknown> { schema: 'cozy-product-save'; saveVersion: number; revision: number; playerId: string; savedAt: string; payload: T; }
export interface SaveMigration { from: number; to: number; migrate(input: Readonly<SaveEnvelope>): SaveEnvelope; }
export type IntegrationErrorCode = 'ASSET_MISSING' | 'ASSET_HASH_MISMATCH' | 'LICENSE_PENDING' | 'LOAD_TIMEOUT' | 'CANCELLED' | 'LIFECYCLE_CONFLICT' | 'PROTOCOL_INCOMPATIBLE' | 'ENGINE_INCOMPATIBLE' | 'SPAWN_INVALID' | 'IDENTITY_REQUIRED' | 'TICKET_EXPIRED' | 'REPLAY_REJECTED' | 'SAVE_TOO_NEW' | 'SAVE_CONFLICT' | 'MIGRATION_FAILED' | 'RESULT_REJECTED';
export interface IntegrationError { code: IntegrationErrorCode; message: string; retryable: boolean; correlationId: string; sceneId?: SceneId; assetId?: string; expected?: string; actual?: string; fallback: 'stay' | 'return' | 'placeholder' | 'read-only'; }
