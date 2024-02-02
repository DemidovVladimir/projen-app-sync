import { NestedStack, NestedStackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import { LayerVersion, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class LambdaAuthorizerStack extends NestedStack {
  readonly lambdaAuth: NodejsFunction;
  constructor(scope: Construct, id: string, props?: NestedStackProps) {
    super(scope, id, props);

    // context we get from external;
    const userName = this.node.tryGetContext('user-name');

    // Lambda Layer for Auth Lambda inside the lambda function
    const authLayer = new LayerVersion(this, 'auth-layer', {
      compatibleRuntimes: [
        Runtime.NODEJS_18_X,
      ],
      code: Code.fromAsset('lib/lambda/layers/auth/'),
      description: 'Added Auth Layer Dep for its modules',
    });

    this.lambdaAuth = new NodejsFunction(this, 'lambda-auth-marketplace', {
      functionName: `${userName}LambdaAuthorizer`,
      runtime: Runtime.NODEJS_18_X,
      entry: 'src/lambdas/authorizer/',
      handler: 'appsync-auth.handler',
      memorySize: 1024,
      timeout: Duration.seconds(30),
      layers: [authLayer],
    });

    // lambda auth creation cfn output
    new CfnOutput(this, 'marketplace-appsync-lambda-auth-op', {
      value: this.lambdaAuth.functionName,
    });
  }
}