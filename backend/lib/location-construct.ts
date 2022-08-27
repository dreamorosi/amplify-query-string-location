import { Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  CfnMap,
  CfnRouteCalculator,
  CfnPlaceIndex,
} from "aws-cdk-lib/aws-location";

interface LocationConstructProps extends StackProps {}

export class LocationConstruct extends Construct {
  mapName: string;
  routeCalculatorName: string;
  placeIndexName: string;

  constructor(scope: Construct, id: string, _props: LocationConstructProps) {
    super(scope, id);

    const mapStyle = "VectorHereExplore";

    const map = new CfnMap(this, "Map", {
      mapName: "AmplifyQueryStringLocation",
      configuration: {
        style: mapStyle,
      },
    });

    this.mapName = map.mapName;

    const routeCalculator = new CfnRouteCalculator(this, "RouteCalculator", {
      calculatorName: "AmplifyQueryStringLocation",
      dataSource: "Here",
    });

    this.routeCalculatorName = routeCalculator.calculatorName;

    const placeIndex = new CfnPlaceIndex(this, "PlaceIndex", {
      indexName: "AmplifyQueryStringLocation",
      dataSource: "Here",
      dataSourceConfiguration: {
        intendedUse: "Storage",
      },
    });

    this.placeIndexName = placeIndex.indexName;

    new CfnOutput(this, "MapName", {
      exportName: `${Stack.of(this).stackName}-LocationMapName`,
      value: this.mapName,
    });

    new CfnOutput(this, "MapStyle", {
      exportName: `${Stack.of(this).stackName}-LocationMapStyle`,
      value: "VectorHereExplore",
    });

    new CfnOutput(this, "RouteCalculatorName", {
      exportName: `${Stack.of(this).stackName}-LocationRouteCalculatorName`,
      value: this.routeCalculatorName,
    });

    new CfnOutput(this, "PlaceIndexName", {
      exportName: `${Stack.of(this).stackName}-LocationPlaceIndexName`,
      value: this.placeIndexName,
    });
  }
}
