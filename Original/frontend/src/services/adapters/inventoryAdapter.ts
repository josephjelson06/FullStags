import type {
  CatalogEntryDto,
  CatalogListDto,
  SupplierProfileDto,
} from '@/services/api/contracts';
import type { InventoryItem, InventoryResponse } from '@/types';

export function toInventoryItem(entry: CatalogEntryDto): InventoryItem {
  return {
    itemId: String(entry.id),
    id: entry.id,
    categoryId: entry.category_id,
    categoryName: entry.category_name,
    partName: entry.part_name,
    partNumber: entry.part_number,
    brand: entry.brand,
    quantity: entry.quantity_in_stock,
    minOrderQuantity: entry.min_order_quantity,
    leadTimeHours: entry.lead_time_hours,
    price: entry.unit_price,
  };
}

export function toInventoryResponse(
  catalog: CatalogListDto,
  supplierProfile: SupplierProfileDto | null,
): InventoryResponse {
  return {
    supplierId: supplierProfile ? String(supplierProfile.id) : '0',
    pickTimeMinutes: 30,
    items: catalog.items.map(toInventoryItem),
  };
}
