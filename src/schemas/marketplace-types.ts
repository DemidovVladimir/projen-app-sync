import { GraphqlType, InterfaceType, ObjectType } from 'awscdk-appsync-utils';
const pluralize = require('pluralize');

export const args = {
  id: GraphqlType.string(),
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
    id: GraphqlType.string(),
    date: GraphqlType.awsDateTime(),
    totalAmount: GraphqlType.float(),
    customer: Customer.attribute(),
    products: Product.attribute({ isList: true }),
  },
});