import {
  BackupVault,
  BackupPlan,
  BackupPlanRule,
  BackupResource,
} from 'aws-cdk-lib/aws-backup';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export function addDynamoDBBackup(scope: Construct, id: string, table: Table) {
  const backupVault = new BackupVault(scope, `${id}Vault`);
  const plan = new BackupPlan(scope, `${id}Plan`, {
    backupVault,
    backupPlanRules: [BackupPlanRule.monthly1Year(backupVault)],
  });
  plan.addSelection(`${id}Selection`, {
    resources: [BackupResource.fromDynamoDbTable(table)],
  });
}
