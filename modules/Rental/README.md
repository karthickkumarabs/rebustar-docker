# Rental Package Service
This module handles the management of rental packages and their associated service types.

## Table of Contents
Usage
Models
RentalPackage
ServiceType
Validation
Operations
Create
Read
Update
Delete
Get Estimation
Get Pricing

# Usage
To use this module, ensure you import it into your routes/index.js.

# Models
RentalPackage
This model stores details of rental packages, such as service types, pricing, and geographical areas of service.

# ServiceType
This schema is embedded within the RentalPackage model and contains information like base fare, time fare, distance fare, cancellation fees, commission, and more.

# Other Required Models
To make full use of this module, the following models must be present:

ServiceType: Defines the types of services offered.
Currency: Manages currency information.
ServiceArea: Defines the service area's geographical boundaries.

# Validation
Rental Validation
Validation is performed using the AJV compiler in accordance with the base application’s validation framework.

# Operations

# Create Package & Create Service Types
Create Rental Package: API for creating a rental package, including service area and fare details.
Create Service Types: API for creating service types inside a rental package. Each service type must define only one combination of trip details (e.g., base fare, distance fare, etc.).

# Read Package & Read Service Types
Read Rental Package: API to retrieve the details of an existing rental package.
Read Service Types: API to fetch service types associated with a rental package.

# Update Package & Update Service Types
Update Rental Package: API to update an existing rental package’s details.
Update Service Types: API to update service types related to a rental package.

# Delete Package & Delete Service Types
Delete Rental Package: API to delete a rental package.
Delete Service Types: API to remove service types from a rental package.

# Get Estimation
Get Estimation: Similar to the daily estimation API, but this version works for rental packages. It calculates the fare based on the time and distance provided.

# Get Pricing
Get Pricing: Functions similarly to the daily get pricing API, but for rental packages. Key differences:
The pricingId argument is used.
The base fare is derived from the package, and the additionalFare array accounts for extra time and distance fare.

# Get Invoice
Get Invoice: Generates an invoice for rental services, using rental pricing strategies, similar to daily invoicing methods.