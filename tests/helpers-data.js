import { validateStates } from '../scripts/lib/census.js';

export const validStates = (states) => validateStates(states).length === 0;
