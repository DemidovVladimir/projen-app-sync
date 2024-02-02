import { App, Stack, StackProps } from 'aws-cdk-lib';
import { CfnDataSource, MappingTemplate } from 'aws-cdk-lib/aws-appsync';
import { BackupVault, BackupPlan, BackupPlanRule, BackupResource } from 'aws-cdk-lib/aws-backup';
import { Table, BillingMode, AttributeType, StreamViewType } from 'aws-cdk-lib/aws-dynamodb';
'aws-cdk-lib/aws-appsync';
import { Role, ServicePrincipal, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, SourceMapMode } from 'aws-cdk-lib/aws-lambda-nodejs';
import { CodeFirstSchema, ResolvableField } from 'awscdk-appsync-utils';
import { Construct } from 'constructs';
import { GraphqlApi } from '@aws-cdk/aws-appsync-alpha';
import { Customer, Order, Product, args } from './schemas/marketplace-types';
declare const dummyRequest: MappingTemplate;
declare const dummyResponse: MappingTemplate;

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

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
    const backupVault = new BackupVault(scope, `${id}Vault`);
    const plan = new BackupPlan(scope, `${id}Plan`, {
      backupVault,
      backupPlanRules: [BackupPlanRule.monthly1Year(backupVault)],
    });
    plan.addSelection(`${id}Selection`, {
      resources: [BackupResource.fromDynamoDbTable(marketplaceTable)],
    });

    // code first graphql schema
    const schema = new CodeFirstSchema();
    const apiMarketplace = new GraphqlApi(this, 'api', { name: 'marketplaceApi', schema });

    // lambda
    const marketplaceLambda = new NodejsFunction(this, 'AppsyncMarketplaceLambda', {
      runtime: Runtime.NODEJS_18_X,
      awsSdkConnectionReuse: true,
      entry: 'lambdas/marketplace',
      handler: 'handler',
      environment: {
        APPSYNC_TABLE: marketplaceTable?.tableName,
      },
      bundling: {
        sourceMap: true,
        sourceMapMode: SourceMapMode.DEFAULT,
      },
    });

    const invokeLambdaRole = new Role(this, 'appsync-lambdaInvoke', {
      assumedBy: new ServicePrincipal('appsync.amazonaws.com'),
    });

    invokeLambdaRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [marketplaceLambda.functionArn],
      actions: ['lambda:InvokeFunction'],
    }));

    // for datasource for the graphql
    const lambdaDs = new CfnDataSource(this, 'MarketplaceLambdaDatasource', {
      apiId: apiMarketplace.apiId,
      name: 'MarketplaceLambdaDatasource',
      type: 'AWS_LAMBDA',
      lambdaConfig: {
        lambdaFunctionArn: marketplaceLambda.functionArn,
      },
      serviceRoleArn: invokeLambdaRole.roleArn,
    });

    // db access for the lambda
    marketplaceTable?.grantFullAccess(marketplaceLambda);

    schema.addQuery('getOrderById', new ResolvableField({
      returnType: Order.attribute(),
      args,
      dataSource: apiMarketplace.addLambdaDataSource('MarketplaceLambda', lambdaDs),
      requestMappingTemplate: dummyRequest,
      responseMappingTemplate: dummyResponse,
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