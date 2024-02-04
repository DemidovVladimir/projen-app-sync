# Marketplace template

## Project infra:
 - DynamoDB with 1 additional Global Secondary key
 - Appsync with code first approach

## Places to improve:
 - Add backup to dynamodb
 - Add pipeline to deploy whatever merged to main branch or release branch
 - Add tests to validate synthesised stack(inline snapshots as an example)
 - Add lambda to be able to provision and check data, probably extend logs(currently data source is directly dynamoDB)

## CLI commands validate:
```bash
  - yarn synth
```

Adding expects inline snapshot to test will generate cloudformation template which can be validate with the assertions.
In any case the cdk.out contains generated cloudformation config file aftre running yarn synth. 