import { commandEnabled, commands, runCommand } from '../state/commands';
import { commandButton } from './controls';

/** An icon button for any app command. */
export const CommandButton = commandButton(commands, runCommand, commandEnabled);
