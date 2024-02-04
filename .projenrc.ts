import { DeployableAwsCdkTypeScriptApp } from 'deployable-awscdk-app-ts';
import { javascript } from 'projen';
const project = new DeployableAwsCdkTypeScriptApp({
  cdkVersion: '2.1.0',
  defaultReleaseBranch: 'main',
  devDeps: [
    'deployable-awscdk-app-ts',
  ],
  deps: [
    'awscdk-appsync-utils@latest',
    '@aws-cdk/aws-appsync-alpha@latest',
  ],
  name: 'project-generated',
  packageManager: javascript.NodePackageManager.YARN,
  projenrcTs: true,
  gitignore: [
    '.env',
  ],
});
project.synth();