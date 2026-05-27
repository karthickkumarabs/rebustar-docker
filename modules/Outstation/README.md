# Outstation Package Service

This module provides for managing outstation packages and associated service types.

## Table of Contents

- [Usage](#usage)
- [Models](#models)
  - [OutstationPackage](#outstationpackage)
  - [ServiceType](#servicetype)
- [Validation](#validation)
  - [Outstation Validation](#outstation-validation)
- [Operations](#operations)
  - [Create](#createpackagecreateservicetypes)
  - [Read](#readpackagereadservicetypes)
  - [Update](#updatepackageupdateservicetypes)
  - [Delete](#deletepackagedeleteservicetypes)
  - [Get Estimation](#getestimation)
  - [Get Pricing](#getpricing)

## Usage

1. To use this module, ensure you import it in your `routes/index.js`.

## Models

### OutstationPackage

This model contains the information related to outstation packages, including service types and pricing information.

### ServiceType

This schema is embedded within the `OutstationPackage` model and must include details like trip type, base fare, additional fares, etc.

### Other Required Models

To effectively use this module, ensure your base application includes the following models:
- **ServiceType**: For defining types of services.
- **Currency**: For handling currency details.
- **ServiceArea**: For defining the geographical area of service.

## Validation

### Outstation Validation

Validation is performed using the AJV compiler according to the base script. This module leverages some base application code for validation purposes.

## Operations

### Create Package & Create Service Types

- **Create Outstation Package**: API available for creating an outstation package with all necessary details.
- **Create Service Types**: API available for creating service types within an outstation package. The `tripType` is unique, and each service type must contain only one `oneway` and one `round` trip type. More than one trip type is not allowed.

### Read Package & Read Service Types

- **Read Outstation Package**: API available to read the details of an outstation package.
- **Read Service Types**: API available to read the details of the service types associated with an outstation package.

### Update Package & Update Service Types

- **Update Outstation Package**: API available for updating the details of an existing outstation package.
- **Update Service Types**: API available for updating the details of the service types associated with an outstation package.

### Delete Package & Delete Service Types

- **Delete Outstation Package**: API available to delete an outstation package.
- **Delete Service Types**: API available to delete service types within an outstation package.

### Get Estimation

- **Get Estimation**: This API works similarly to the daily get estimation API but is specifically tailored for outstation packages, except for the service types.

### Get Pricing

- **Get Pricing**: Functions similarly to the daily get pricing API, with one key difference: an argument is changed to `pricingId` instead of `Outstation.serviceType._id`. Distance and time fare are maintained at 0. The `baseFare` is considered the package fare, and the `additionalFare` array includes extra distance fare and extra hours fare.

### Get Invoice

- **Get Invoice**: Similar to the daily invoice function, but it incorporates the outstation pricing strategy. All other aspects are maintained as per the daily operations.
