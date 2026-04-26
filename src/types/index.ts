export interface UserProfile {
  id: string;
  name: string;
  pin: string;        // stored as bcrypt hash
  avatarColor: string;
  initials: string;
  streakDays: number;
  createdAt: string;
}

export interface Drink {
  id: string;
  name: string;
  pricePerUnit: number;
  colorHex: string;
  sortOrder: number;
  isActive: boolean;
}

export interface StockEntry {
  id: string;
  userId: string;
  drinkId: string;
  quantity: number;
  updatedAt: string;
}

export interface SaleItem {
  drinkId: string;
  unitsSold: number;
}

export interface SalesRecord {
  id: string;
  userId: string;
  date: string;         // "YYYY-MM-DD"
  entries: SaleItem[];
  confirmedAt: string;
}

export interface RestockItem {
  drinkId: string;
  unitsAdded: number;
  newTotal: number;
}

export interface RestockRecord {
  id: string;
  userId: string;
  date: string;
  entries: RestockItem[];
  mode: 'add' | 'set';
  createdAt: string;
}