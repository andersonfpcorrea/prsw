import { CfnElement, Fn, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Runtime, Code, Function } from "aws-cdk-lib/aws-lambda";
import { RestApi, LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

interface ApiStackProps extends StackProps {
  stageName?: string;
  restaurantsTable?: Table;
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: ApiStackProps) {
    super(scope, id, props);

    const api = new RestApi(this, `${props?.stageName}-MyApi`, {
      deployOptions: { stageName: props?.stageName },
    });

    const apiLogicalId =
      api && api.node && api.node.defaultChild
        ? this.getLogicalId(api.node.defaultChild as CfnElement)
        : undefined;

    const lambdaFunction = new NodejsFunction(this, "GetIndex", {
      runtime: Runtime.NODEJS_LATEST,
      handler: "handler",
      entry: "functions/get-index.js",
      bundling: {
        commandHooks: {
          afterBundling(inputDir, outputDir) {
            return [
              `mkdir ${outputDir}/static`,
              `cp ${inputDir}/static/index.html ${outputDir}/static/index.html`,
            ];
          },
          beforeBundling() {
            return [];
          },
          beforeInstall() {
            return [];
          },
        },
      },
      environment: {
        restaurants_api: Fn.sub(
          `https://\${${apiLogicalId}}.execute-api.\${AWS::Region}.amazonaws.com/${props?.stageName}/restaurants`
        ),
      },
    });

    const getRestaurantsFunction = new Function(this, "GetRestaurants", {
      runtime: Runtime.NODEJS_LATEST,
      handler: "get-restaurants.handler",
      code: Code.fromAsset("functions"),
      environment: {
        default_results: "8",
        restaurants_table: props?.restaurantsTable?.tableName || "",
      },
    });

    props?.restaurantsTable?.grantReadData(getRestaurantsFunction);

    const lambdaIntegration = new LambdaIntegration(lambdaFunction);
    const getRestaurantsLambdaIntegration = new LambdaIntegration(
      getRestaurantsFunction
    );
    api.root.addMethod("GET", lambdaIntegration);
    api.root
      .addResource("restaurants")
      .addMethod("GET", getRestaurantsLambdaIntegration);
  }
}
