import { Drink } from '../types';

export const DEFAULT_DRINKS: Drink[] = [
  { id: 'd1', name: 'Salaam Cola',     pricePerUnit: 22, colorHex: '#1D9E75', sortOrder: 1, isActive: true },
  { id: 'd2', name: 'Chocomel',         pricePerUnit: 22, colorHex: '#7F77DD', sortOrder: 2, isActive: true },
  { id: 'd3', name: 'Cassis',           pricePerUnit: 25, colorHex: '#D4537E', sortOrder: 3, isActive: true },
  { id: 'd4', name: 'Ginger Ale',       pricePerUnit: 27, colorHex: '#EF9F27', sortOrder: 4, isActive: true },
  { id: 'd5', name: 'Fritz Kola Zero',  pricePerUnit: 30, colorHex: '#D85A30', sortOrder: 5, isActive: true },
  { id: 'd6', name: 'Fritz Kola Orange',pricePerUnit: 30, colorHex: '#378ADD', sortOrder: 6, isActive: true },
  { id: 'd7', name: 'Fritz Kola Lemon', pricePerUnit: 30, colorHex: '#639922', sortOrder: 7, isActive: true },
  { id: 'd8', name: 'Fritz Kola Rhubarb',pricePerUnit:30, colorHex: '#C46BA8', sortOrder: 8, isActive: true },
];

export const LOW_STOCK_THRESHOLD = 200;
export const CRITICAL_STOCK_THRESHOLD = 50;