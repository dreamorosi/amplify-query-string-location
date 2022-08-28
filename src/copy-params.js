import { writeFile, readFile } from "node:fs/promises";

const template = {
  aws_project_region: "AWS_REGION",
  aws_cognito_identity_pool_id: "COGNITO_IDENTITY_POOL_ID",
  aws_cognito_region: "AWS_REGION",
  aws_user_pools_id: "COGNITO_USER_POOL_ID",
  aws_user_pools_web_client_id: "COGNITO_CLIENT_ID",
  geo: {
    amazon_location_service: {
      region: "AWS_REGION",
      maps: {
        items: {},
        default: "MAP_NAME",
      },
      search_indices: {
        items: [],
        default: "PLACE_INDEX_NAME",
      },
      routeCalculator: "ROUTE_CALCULATOR_NAME",
    },
  },
};

const bannerText = `/* eslint-disable */`;

const footerText = `export default awsmobile;`;

const getValueFromNamePart = (namePart, values) =>
  values.find((el) => el.includes(namePart));

const main = async () => {
  let params;
  try {
    const fileContent = await readFile("backend/cdk.out/params.json");
    params = JSON.parse(fileContent);
  } catch (err) {
    console.error(err);
    console.error(
      "Did you run `cdk deploy --outputs-file cdk.out/params.json` in the backend folder?"
    );
  }

  const paramsKeys = Object.keys(params.AmplifyQueryStringLocationStack);
  const paramsValues = params.AmplifyQueryStringLocationStack;

  const region = paramsValues[getValueFromNamePart(`AWSRegion`, paramsKeys)];
  template.aws_project_region = region;
  template.aws_cognito_identity_pool_id =
    paramsValues[getValueFromNamePart(`IdentityPoolId`, paramsKeys)];
  template.aws_cognito_region = region;
  template.aws_user_pools_id =
    paramsValues[getValueFromNamePart(`UserPoolId`, paramsKeys)];
  template.aws_user_pools_web_client_id =
    paramsValues[getValueFromNamePart(`UserPoolClientId`, paramsKeys)];
  template.geo.amazon_location_service.region = region;
  const mapName = paramsValues[getValueFromNamePart(`MapName`, paramsKeys)];
  template.geo.amazon_location_service.maps.items = {};
  template.geo.amazon_location_service.maps.items[mapName] = {
    style: paramsValues[getValueFromNamePart(`MapStyle`, paramsKeys)],
  };
  template.geo.amazon_location_service.maps.default = mapName;
  const placeIndexName =
    paramsValues[getValueFromNamePart(`PlaceIndexName`, paramsKeys)];
  template.geo.amazon_location_service.search_indices.items.push(
    placeIndexName
  );
  template.geo.amazon_location_service.search_indices.default = placeIndexName;
  template.geo.amazon_location_service.routeCalculator =
    paramsValues[getValueFromNamePart(`RouteCalculatorName`, paramsKeys)];

  try {
    await writeFile(
      "src/aws-exports.cjs",
      `${bannerText}

const awsmobile = ${JSON.stringify(template, null, 2)}

${footerText}
  `
    );
  } catch (err) {
    console.error(err);
    console.error("Unable to write file");
  }
};

main();
