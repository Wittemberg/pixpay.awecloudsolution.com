# Capability: Bootstrap Runtime

## ADDED Requirements

### Requirement: API Health and Readiness Endpoints
The API service SHALL provide HTTP endpoints at `/api/health` and `/api/v1/health` returning JSON with status `ok` and the active application revision.

#### Scenario: Successful health check
- GIVEN the API service is running on its designated port
- WHEN a GET request is made to `/api/health`
- THEN the HTTP status code SHALL be 200
- AND the JSON response body SHALL contain `"status": "ok"` and `"app": "pixpay-api"`

### Requirement: Web Interface Serving
The Web service SHALL serve the PIXPAY responsive web interface at `/` and respond to health check probes.

#### Scenario: Accessing the web dashboard
- GIVEN the Web service is running on its designated port
- WHEN a GET request is made to `/`
- THEN the HTTP status code SHALL be 200
- AND the response SHALL contain the HTML document for PIXPAY

#### Scenario: Web health check
- GIVEN the Web service is running
- WHEN a GET request is made to `/api/health`
- THEN the HTTP status code SHALL be 200
- AND the JSON response body SHALL contain `"status": "ok"`

### Requirement: Worker Lifecycle Management
The Worker service SHALL start, handle environment variables, and manage termination signals gracefully.

#### Scenario: Worker graceful startup and teardown
- GIVEN the Worker service is executed
- WHEN the process initializes
- THEN it SHALL log that the background worker is active
- AND when a SIGTERM signal is received, it SHALL terminate cleanly with exit code 0
