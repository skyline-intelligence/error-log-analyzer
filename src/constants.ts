import pluginJson from './plugin.json';

export const PLUGIN_BASE_URL = `/a/${pluginJson.id}`;

export enum ROUTES {
  One = 'one',
  Two = 'two',
  Three = 'three',
  Four = 'four',
  Hour = 'hour',
  Minute = 'minute',
  RealTime = 'realtime',
  RolesConfiguration= 'roles',
  RulesConfiguration= 'rules',
}
