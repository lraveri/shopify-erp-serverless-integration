# Case Study: Building a Custom Serverless Integration Between an E-commerce Platform and an ERP on AWS

When building an integration between an e-commerce platform and another system for example a CRM or an ERP, one of the key advantages is flexibility. A custom solution allows for precise control over how data is transferred, mapped, and processed. However, the downside is increased complexity and higher development and maintenance costs, including infrastructure management.

A serverless architecture can help mitigate some of these challenges. With serverless, you benefit from a pay-per-use model, which eliminates the need for managing servers and reduces infrastructure costs. Additionally, serverless solutions scale automatically to handle varying loads, making them highly adaptable.

Using a framework like Serverless Framework further simplifies the process. It allows developers to focus on writing code while handling much of the deployment and resource provisioning through Infrastructure as Code. This reduces the overhead of managing cloud infrastructure and speeds up the development cycle, leading to faster delivery.


## Scenario Description

In our case, the e-commerce platform is Shopify, and the system we’re integrating with is Netsuite, an ERP used for managing business processes such as finance, operations, and customer relations. The goal is to keep orders and customer data synchronized between Shopify and Netsuite.

We can leverage Shopify’s webhooks, which are automated messages sent from one app to another. A webhook is triggered whenever a specific event occurs—in this case, when an order is created or when a customer is created or updated.

Netsuite provides custom APIs that allow us to create orders and upsert (create or update) customer records. Netsuite, however, comes with some constraints. For instance, it can process a maximum of 5 API calls at a time. Additionally, if two orders or customers with the same Id are sent to Netsuite in a short period, there’s a risk of creating duplicates.

## Reference Architecture

In this solution, we’ve designed a robust, scalable, and cost-efficient integration between Shopify and Netsuite using AWS serverless services.

The process starts when a webhook from Shopify is triggered, for example, when a new order is placed or a customer is created or updated. This webhook hits an API Gateway, which is the entry point for our system. The API Gateway then invokes a Lambda function that handles the initial processing. The Lambda performs an authorization check to ensure that only valid requests are processed. Once validated, the payload is dispatched to an SQS queue, which acts as a buffer, allowing us to control the flow of data into Netsuite.

Each job in the SQS queue processes one record at a time. This is crucial because Netsuite can only handle 5 concurrent API calls, so processing jobs sequentially helps us avoid overwhelming the system. Before each job is processed, we check a DynamoDB table to see if the order ID or customer ID has already been logged. This prevents duplicate records from being created, which is essential given that Netsuite has no built-in protection against duplicate entries when multiple similar requests come in quickly.

Once a job is ready for processing, the necessary field mappings between Shopify and Netsuite are applied. The Lambda then calls Netsuite’s custom API to either create or update (upsert) the relevant order or customer.

Throughout the entire process, all events are logged in CloudWatch, giving us full visibility into the system’s behavior. We’ve set up CloudWatch Insights queries to monitor key metrics and performance. In the case of any errors, CloudWatch alerts are configured to send immediate notifications via email, ensuring that issues are quickly identified and resolved.

Finally, security is a top priority. All sensitive information, such as API credentials for Netsuite, is securely stored in AWS Secrets Manager. This ensures that credentials are managed safely, eliminating the risk of exposure through hard-coded secrets or environment variables.

This architecture provides you with a solution that is highly scalable, with minimal operational overhead, while ensuring data integrity and system reliability.