import { CfnElement, CfnOutput, Fn, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Runtime, Code, Function } from "aws-cdk-lib/aws-lambda";
import {
  RestApi,
  LambdaIntegration,
  AuthorizationType,
  CfnAuthorizer,
} from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";

interface ApiStackProps extends StackProps {
  stageName?: string;
  restaurantsTable?: Table;
  cognitoUserPool: UserPool;
  webUserPoolClient: UserPoolClient;
  serverUserPoolClient: UserPoolClient;
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

    const getIndexFunction = new NodejsFunction(this, "GetIndex", {
      runtime: Runtime.NODEJS_22_X,
      handler: "handler",
      entry: ".dist/functions/get-index/get-index.js",
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
        cognito_user_pool_id: props?.cognitoUserPool.userPoolId ?? "",
        cognito_client_id: props?.webUserPoolClient.userPoolClientId ?? "",
      },
    });

    const getRestaurantsFunction = new Function(this, "GetRestaurants", {
      runtime: Runtime.NODEJS_22_X,
      handler: "get-restaurants.handler",
      code: Code.fromAsset(".dist/functions/get-restaurants"),
      environment: {
        default_results: "8",
        restaurants_table: props?.restaurantsTable?.tableName || "",
      },
    });
    props?.restaurantsTable?.grantReadData(getRestaurantsFunction);

    const searchRestaurantsFunction = new Function(this, "SearchRestaurants", {
      runtime: Runtime.NODEJS_20_X,
      handler: "search-restaurants.handler",
      code: Code.fromAsset(".dist/functions/search-restaurants"),
      environment: {
        default_results: "8",
        restaurants_table: props?.restaurantsTable?.tableName || "",
      },
    });
    props?.restaurantsTable?.grantReadData(searchRestaurantsFunction);

    const lambdaIntegration = new LambdaIntegration(getIndexFunction);
    const getRestaurantsLambdaIntegration = new LambdaIntegration(
      getRestaurantsFunction
    );
    const searchRestaurantsLambdaIntegration = new LambdaIntegration(
      searchRestaurantsFunction
    );

    const cognitoAuthorizer = new CfnAuthorizer(this, "CognitoAuthorizer", {
      name: "CognitoAuthorizer",
      type: "COGNITO_USER_POOLS",
      identitySource: "method.request.header.Authorization",
      providerArns: [props?.cognitoUserPool?.userPoolArn ?? ""],
      restApiId: api.restApiId,
    });

    api.root.addMethod("GET", lambdaIntegration);

    const restaurantResouce = api.root.addResource("restaurants");
    restaurantResouce.addMethod("GET", getRestaurantsLambdaIntegration, {
      authorizationType: AuthorizationType.IAM,
    });
    restaurantResouce
      .addResource("search")
      .addMethod("POST", searchRestaurantsLambdaIntegration, {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: { authorizerId: cognitoAuthorizer.ref },
      });

    const apiInvokePolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["execute-api:Invoke"],
      resources: [
        Fn.sub(
          `arn:aws:execute-api:\${AWS::Region}:\${AWS::AccountId}:\${${apiLogicalId}}/${props?.stageName}/GET/restaurants`
        ),
      ],
    });

    getIndexFunction.role?.addToPrincipalPolicy(apiInvokePolicy);

    new CfnOutput(this, "ApiUrl", {
      value: api.url,
    });

    new CfnOutput(this, "CognitoServerClientId", {
      value: props?.serverUserPoolClient.userPoolClientId ?? "",
    });
  }
}
