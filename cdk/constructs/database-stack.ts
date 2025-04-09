import { Table, AttributeType, BillingMode } from "aws-cdk-lib/aws-dynamodb";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

interface DatabaseStackProps extends StackProps {
  stageName?: string;
}

export class DatabaseStack extends Stack {
  restaurantsTable: Table;
  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const restaurantstable = new Table(this, "RestaurantsTable", {
      partitionKey: {
        name: "name",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    this.restaurantsTable = restaurantstable;
  }
}
