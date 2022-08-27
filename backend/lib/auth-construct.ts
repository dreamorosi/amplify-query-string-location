import { Stack, StackProps, CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { IRole, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import {
  AccountRecovery,
  UserPool,
  IUserPool,
  UserPoolClient,
  VerificationEmailStyle,
} from "aws-cdk-lib/aws-cognito";
import {
  IdentityPool,
  UserPoolAuthenticationProvider,
} from "@aws-cdk/aws-cognito-identitypool-alpha";

interface AuthConstructProps extends StackProps {
  mapName: string;
  routeCalculatorName: string;
  placeIndexName: string;
}

export class AuthConstruct extends Construct {
  unauthRole: IRole;
  userPool: IUserPool;

  constructor(scope: Construct, id: string, props: AuthConstructProps) {
    super(scope, id);

    const { mapName, routeCalculatorName, placeIndexName } = props;

    this.userPool = new UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      userVerification: {
        emailStyle: VerificationEmailStyle.CODE,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const userPoolClient = new UserPoolClient(this, "UserPoolClient", {
      userPool: this.userPool,
    });

    const { unauthenticatedRole, identityPoolId } = new IdentityPool(
      this,
      "myIdentityPool",
      {
        allowUnauthenticatedIdentities: true,
        authenticationProviders: {
          userPools: [
            new UserPoolAuthenticationProvider({ userPool: this.userPool }),
          ],
        },
      }
    );

    this.unauthRole = unauthenticatedRole;
    this.unauthRole.attachInlinePolicy(
      new Policy(this, "locationService", {
        statements: [
          new PolicyStatement({
            actions: ["geo:GetMap*"],
            resources: [
              `arn:aws:geo:${Stack.of(this).region}:${
                Stack.of(this).account
              }:map/${mapName}`,
            ],
          }),
          new PolicyStatement({
            actions: ["geo:SearchPlaceIndex*"],
            resources: [
              `arn:aws:geo:${Stack.of(this).region}:${
                Stack.of(this).account
              }:place-index/${placeIndexName}`,
            ],
          }),
          new PolicyStatement({
            actions: ["geo:CalculateRoute*"],
            resources: [
              `arn:aws:geo:${Stack.of(this).region}:${
                Stack.of(this).account
              }:route-calculator/${routeCalculatorName}`,
            ],
          }),
        ],
      })
    );

    new CfnOutput(this, "UserPoolId", {
      exportName: `${Stack.of(this).stackName}-CognitoUserPoolsId`,
      value: this.userPool.userPoolId,
    });

    new CfnOutput(this, "UserPoolClientId", {
      exportName: `${Stack.of(this).stackName}-CognitoUserPoolsWebClientId`,
      value: userPoolClient.userPoolClientId,
    });

    new CfnOutput(this, "IdentityPoolId", {
      exportName: `${Stack.of(this).stackName}-CognitoIdentityPoolId`,
      value: identityPoolId,
    });
  }
}
