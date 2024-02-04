import { GraphqlApi, ISchema, MappingTemplate } from '@aws-cdk/aws-appsync-alpha';
import { App, Stack, StackProps, aws_appsync } from 'aws-cdk-lib';
import { Table, BillingMode, AttributeType, StreamViewType } from 'aws-cdk-lib/aws-dynamodb';
// import { Runtime } from 'aws-cdk-lib/aws-lambda';
// import { NodejsFunction, SourceMapMode } from 'aws-cdk-lib/aws-lambda-nodejs';
import { CodeFirstSchema, ResolvableField } from 'awscdk-appsync-utils';
import { Construct } from 'constructs';
import { Customer, Order, Product, argsOrders, argsProducts } from './schemas/marketplace-types';
declare const dummyRequest: MappingTemplate;
declare const dummyResponse: MappingTemplate;

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // dynamodb using single table design
    const marketplaceTable = new Table(this, 'Marketplace', {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'PK',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: AttributeType.STRING,
      },
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      pointInTimeRecovery: true,
    });

    // add global secondary index to map customer orders to products
    marketplaceTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: {
        name: 'G1K',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'G1S',
        type: AttributeType.STRING,
      },
    });

    // code first graphql schema
    const schema = new CodeFirstSchema();

    // graphql api
    const apiMarketplace = new GraphqlApi(this, 'marketplaceApi', { name: 'marketplaceApi', schema: schema as unknown as ISchema });

    // add query resolvers to get orders by customer id
    schema.addQuery('getOrdersByCustomerId', new ResolvableField({
      returnType: Order.attribute({ isList: true }),
      args: argsOrders,
      dataSource: apiMarketplace.addDynamoDbDataSource('MarketplaceGetOrderByCustomerId', marketplaceTable) as unknown as aws_appsync.BaseDataSource,
      requestMappingTemplate: MappingTemplate.dynamoDbGetItem('PK', 'SK'),
      responseMappingTemplate: MappingTemplate.dynamoDbResultItem(),
    }));

    // add query resolver to get all products by order id
    schema.addQuery('getProductsByOrderId', new ResolvableField({
      returnType: Order.attribute({ isList: true }),
      args: argsProducts,
      dataSource: apiMarketplace.addDynamoDbDataSource('MarketplaceGetProducstByOrderId', marketplaceTable) as unknown as aws_appsync.BaseDataSource,
      requestMappingTemplate: MappingTemplate.dynamoDbScanTable(),
      responseMappingTemplate: MappingTemplate.dynamoDbResultList(),
    }));

    schema.addType(Product);
    schema.addType(Customer);
    schema.addType(Order);
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'project-generated-dev', { env: devEnv });
// new MyStack(app, 'project-generated-prod', { env: prodEnv });

app.synth();