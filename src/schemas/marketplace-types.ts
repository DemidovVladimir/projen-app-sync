import { GraphqlType, InterfaceType, ObjectType } from 'awscdk-appsync-utils';

export const argsOrders = {
  // PK example: 'CUSTOMER#123'
  PK: GraphqlType.string(),
  // SK example: 'ORDER#123 or begins with ORDER#123-',
  SK: GraphqlType.string(),
};

export const argsProducts = {
  // G1K example: 'ORDER#123'
  G1K: GraphqlType.string(),
  // G1S example: 'PRODUCT#123 or begins with PRODUCT#123-'
  G1S: GraphqlType.string(),
};

export const Product = new InterfaceType('Product', {
  definition: {
    price: GraphqlType.float(),
    quantity: GraphqlType.int(),
  },
});

export const Customer = new InterfaceType('Customer', {
  definition: {
    email: GraphqlType.string(),
    fullName: GraphqlType.string(),
  },
});

export const Order = new ObjectType('Order', {
  definition: {
    date: GraphqlType.awsDateTime(),
    totalAmount: GraphqlType.float(),
    customer: Customer.attribute(),
    products: Product.attribute({ isList: true }),
  },
});