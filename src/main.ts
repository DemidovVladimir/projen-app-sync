import { App, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { CfnDataSource, CfnGraphQLApi, CfnGraphQLSchema, Code } from 'aws-cdk-lib/aws-appsync';
import { Table, BillingMode, AttributeType, StreamViewType } from 'aws-cdk-lib/aws-dynamodb';
'aws-cdk-lib/aws-appsync';
import { Role, ServicePrincipal, ManagedPolicy, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, SourceMapMode } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { readFileSync } from 'fs';
// import { addDynamoDBBackup } from './libs/dynamodb-backup';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    /*
    * @notice Table Structure
    * Primary Key:
    *  - Partition Key: PK
    *  - Sort Key: SK
    * Attributes:
    *  - Type: To distinguish between Customer, Order, and Product.
    *  - Data: Email, FullName, OrderId, OrderDate, TotalAmount, ProductsQuantity, ProductName, Price, etc.
    * @notice Item Example
    * Customer Item:
    *  - PK: CUSTOMER#<email>
    *  - SK: METADATA#<email>
    *  - Type: Customer
    *  - Email: customer's email
    *  - FullName: customer's full name
    * Order Item (linked to Customer):
    *  - PK: CUSTOMER#<email>
    *  - SK: ORDER#<orderId>
    *  - Type: Order
    *  - OrderId: order's ID
    *  - OrderDate: date of the order
    *  - TotalAmount: total amount of the order
    *  - ProductsQuantity: number of different products in the order
    * Product Item (as part of an Order):
    *  - PK: ORDER#<orderId>
    *  - SK: PRODUCT#<productName>
    *  - Type: Product
    *  - ProductName: product's name
    *  - Price: price of the product
    */
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
      // can be enables only for production environment to optimize the cost
      // deletionProtection: serviceStage === 'production',
    });
    // add backups for prod
    // addDynamoDBBackup(this, 'Marketplace', table);

    // cloudwatch logs for Appsync
    const cloudWatchLogsRole = new Role(this, 'AppSyncCloudWatchRole', {
      roleName: 'CloudWatchRoleForAppSync',
      assumedBy: new ServicePrincipal('appsync.amazonaws.com'),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSAppSyncPushToCloudWatchLogs')],
    });

    // creating appsync api
    const marketplaceApi = new CfnGraphQLApi(this, 'MarketplaceApiTesting', {
      authenticationType: 'AWS_LAMBDA',
      name: 'marketplace-appsync-endpoint',
      // this shoule be only enabled for production environment to reduce the price
      xrayEnabled: false,
      logConfig: {
        cloudWatchLogsRoleArn: cloudWatchLogsRole.roleArn,
        excludeVerboseContent: false,
        fieldLogLevel: 'ERROR',
      },
    });

    // Graphql schema
    const marketplaceSchema = new CfnGraphQLSchema(this, 'MarketplaceSchema', {
      apiId: marketplaceApi.attrApiId,
      definition: readFileSync('schemas/mraketplace-schema.graphql').toString(),
    });

    // // Lambda Layer for easier and faster deployment
    // const resolverLayer = new LayerVersion(this, 'marketplace-resolver-layer', {
    //   compatibleRuntimes: [
    //     Runtime.NODEJS_18_X,
    //   ],
    //   code: Code.fromAsset('libs'),
    //   description: 'Added CRUD Resolver codes for this lambda to use it',
    // });

    // lambda
    const marketplaceLambda = new NodejsFunction(this, 'AppsyncMarketplaceLambda', {
      runtime: Runtime.NODEJS_18_X,
      awsSdkConnectionReuse: true,
      entry: 'lambdas/marketplace',
      handler: 'handler',
      timeout: Duration.seconds(5),
      environment: {
        APPSYNC_TABLE: marketplaceTable?.tableName,
      },
      bundling: {
        sourceMap: true,
        sourceMapMode: SourceMapMode.DEFAULT,
      },
      memorySize: 128,
    });

    const invokeLambdaRole = new Role(this, 'appsync-lambdaInvoke', {
      assumedBy: new ServicePrincipal('appsync.amazonaws.com'),
    });

    invokeLambdaRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [marketplaceLambda.functionArn],
      actions: ['lambda:InvokeFunction'],
    }));

    // authorizer Role if needed for auth path
    const allowAppSyncPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: [
        'arn:aws:iam::*:role/aws-service-role/appsync.amazonaws.com/AWSServiceRoleForAppSync',
      ],
    });

    // for datasource for the graphql
    const lambdaDs = new CfnDataSource(this, 'MarketplaceLambdaDatasource', {
      apiId: marketplaceApi.attrApiId,
      name: 'MarketplaceLambdaDatasource',
      type: 'AWS_LAMBDA',
      lambdaConfig: {
        lambdaFunctionArn: marketplaceLambda.functionArn,
      },
      serviceRoleArn: invokeLambdaRole.roleArn,
    });

    // adding api dependcy to datasource
    lambdaDs.addDependsOn(marketplaceApi);

    // db access for the lambda
    marketplaceTable?.grantFullAccess(marketplaceLambda);
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