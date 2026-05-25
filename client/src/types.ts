export interface List {
  id: number;
  name: string;
  created_at: string;
  items: Item[];
}

export interface Item {
  id: number;
  list_id: number;
  name: string;
  quantity: number;
  created_at: string;
}

export interface ProcessedItem {
  name: string;
  listName: string;
  quantity: number;
  resolvedListId: number | null;
  resolvedListName: string;
  isDuplicate: boolean;
  existingItem?: Item;
}
