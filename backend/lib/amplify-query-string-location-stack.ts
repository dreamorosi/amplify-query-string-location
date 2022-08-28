import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { AuthConstruct } from "./auth-construct";
import { LocationConstruct } from "./location-construct";

export class AmplifyQueryStringLocationStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const { mapName, routeCalculatorName, placeIndexName } =
      new LocationConstruct(this, "LocationConstruct", {});

    new AuthConstruct(this, "AuthConstruct", {
      mapName,
      routeCalculatorName,
      placeIndexName,
    });

    new CfnOutput(this, "AWSRegion", {
      exportName: `${Stack.of(this).stackName}-region`,
      value: Stack.of(this).region,
    });
  }
}
