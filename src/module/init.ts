import { MODULE_ID, SETTINGS } from './constants';
import { registerSettings } from './settings';
import { autoRegisterBabel, handleBabeleDataLoaded } from './babele-registration';

export { MODULE_ID } from './constants';

Hooks.on('init', () => {
  registerSettings();

  if (game.settings.get(MODULE_ID, SETTINGS.AUTO_REGISTER)) {
    void autoRegisterBabel();
  }
  console.log(`${MODULE_ID} | 初始化完成`);
});

// `babele.dataLoaded` is a custom hook fired by the Babele module, so it is not
// part of foundry-vtt-types' built-in hook map.
Hooks.on('babele.dataLoaded' as Hooks.HookName, handleBabeleDataLoaded);
