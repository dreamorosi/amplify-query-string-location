import { Stack, StackProps } from "aws-cdk-lib";
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
  }
}
