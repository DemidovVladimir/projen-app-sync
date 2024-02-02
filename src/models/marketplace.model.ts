// Base interface for common attributes
interface BaseItem {
  PK: string;
  SK: string;
  Type: string;
}

// Interface for Customer Item
interface CustomerItem extends BaseItem {
  Email: string;
  FullName: string;
}

// Interface for Order Item
interface OrderItem extends BaseItem {
  OrderId: string;
  OrderDate: string;
  TotalAmount: number;
  ProductsQuantity: number;
}

// Interface for Product Item
interface ProductItem extends BaseItem {
  ProductName: string;
  Price: number;
}
