/**
 * Weather Service - free weather forecasts via Open-Meteo
 */

import type { UniService } from '@uni/shared';
import { weatherCommand } from './commands/weather';

const weatherService: UniService = {
  name: 'weather',
  description: 'Weather forecasts (Open-Meteo)',
  version: '0.1.0',

  commands: [weatherCommand],

  // No auth needed - Open-Meteo is free
};

export default weatherService;
