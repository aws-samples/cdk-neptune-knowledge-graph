const cdk = require("aws-cdk-lib")
const apigw = require("aws-cdk-lib/aws-apigateway")
const lambda = require("aws-cdk-lib/aws-lambda")
const ec2 = require("aws-cdk-lib/aws-ec2")
const { Construct } = require("constructs")

/**
 * Creates the REST API and Lambda functions to access graph data.
 * 
 * Configure with `{ cluster, vpc }`.
 */
class NeptuneApiConstruct extends Construct {

    constructor(scope, id, props) {
        super(scope, id, props)

        if (!props.cluster) {
            throw new Error("Missing property: cluster")
        }

        if (!props.vpc) {
            throw new Error("Missing property: vpc")
        }

        // Create the REST API

        const allowHeaders = apigw.Cors.DEFAULT_HEADERS.slice()
        allowHeaders.push("X-KG-Partition")
        const apiOptions = {
            defaultCorsPreflightOptions: {
                allowOrigins: apigw.Cors.ALL_ORIGINS,
                allowMethods: apigw.Cors.ALL_METHODS,
                allowHeaders,
            },
            loggingLevel: apigw.MethodLoggingLevel.INFO,
            dataTraceEnabled: true,
        }

        const api = new apigw.RestApi(this, "graph-api", apiOptions)

        // Send CORS headers on expired token OPTIONS requests, 
        // or the browser won't know to refresh. (Note single quotes!)
        const allow = "'Authorization,Content-Type,X-Amz-Date,X-Amz-Security-Token,X-Api-Key,X-KG-Partition'"
        api.addGatewayResponse("ExpiredTokenResponse", {
            responseHeaders: {
                "Access-Control-Allow-Headers": allow,
                "Access-Control-Allow-Origin": "'*'",
            },
            statusCode: "401",
            type: apigw.ResponseType.EXPIRED_TOKEN,
        })

        const envVars = {
            "NEPTUNE_ENDPOINT": props.cluster.clusterEndpoint.hostname, 
            "NEPTUNE_PORT": props.cluster.clusterEndpoint.port, 
            "USE_IAM": "true",
            "EXPORT_BUCKET": props.exportBucket.bucketName,
        }

        const lambdaSecurityGroup = new ec2.SecurityGroup(this, "LambdaSG", {
            vpc: props.vpc, 
            description: "Knowledge Graph Lambda Security Group",
        })

        // Add an ingress rule to the cluster's security group from the lambda sg
        const port = props.cluster.clusterEndpoint.port
        props.clusterSecurityGroup.addIngressRule(
            lambdaSecurityGroup, ec2.Port.tcp(port))


        const auth = new apigw.CognitoUserPoolsAuthorizer(this, "graph-authorizer", {
            cognitoUserPools: [props.userPool],
        })
  
        // Options that are the same for each Lambda function
        const lambdaOptions = {
            vpc: props.vpc, 
            api, 
            envVars, 
            lambdaSecurityGroup, 
            cluster: props.cluster, 
            clusterSecurityGroup: props.clusterSecurityGroup,
            auth,
        }

        // Create lambdas for handling nodes and edges
        this.addLambda("search-post", "post", lambdaOptions)
        this.addLambda("node-post", "post", lambdaOptions)
        this.addLambda("edge-post", "post", lambdaOptions)
        this.addLambda("node-delete", "delete", lambdaOptions)
        this.addLambda("edge-delete", "delete", lambdaOptions)

        // NOTE that if you add a lambda here, you also must add it to webpack.config.js

        // Create the jwt handler without COGNITO auth
        const jwtOptions = Object.assign({}, lambdaOptions)
        jwtOptions.auth = undefined
        jwtOptions.envVars.COGNITO_REDIRECT_URI = props.cognitoRedirectUri
        jwtOptions.envVars.COGNITO_DOMAIN_PREFIX = props.cognitoDomainPrefix
        jwtOptions.envVars.COGNITO_APP_CLIENT_ID = props.cognitoAppClientId
        jwtOptions.envVars.COGNITO_REGION = props.cognitoRegion
        jwtOptions.envVars.COGNITO_POOL_ID = props.cognitoPoolId
        this.addLambda("jwt-get", "get-no-id", jwtOptions)

        // Lambda functions to import and export data to S3 and provide a signed URL
        const exportLambdaOptions = Object.assign({}, lambdaOptions)
        exportLambdaOptions.envVars.BUCKET_NAME = props.exportBucket.bucketName
        const exportLambda = this.addLambda("export-url-get", "get-no-id", exportLambdaOptions)
        const importLambda = this.addLambda("import-url-get", "get", exportLambdaOptions)
        const importPostLambda = this.addLambda("import-post", "post", exportLambdaOptions)
        props.exportBucket.grantReadWrite(exportLambda)
        props.exportBucket.grantReadWrite(importLambda)
        props.exportBucket.grantReadWrite(importPostLambda)

        // Create the integration test Lambda
        const testLambda = new lambda.Function(this, "gremlin-test", {
            runtime: lambda.Runtime.NODEJS_14_X,
            code: lambda.Code.fromAsset("lambda/dist"),
            handler: "integration-test.handler",
            vpc: props.vpc, 
            timeout: cdk.Duration.seconds(10),
            memorySize: 1536,
            environment: envVars,
            securityGroups: [lambdaSecurityGroup],
        })

        props.cluster.grantConnect(testLambda)
    }

    /**
     * Create a lambda resource handler.
     * 
     * @param {} name 
     * @param {*} options
     */
    addLambda(name, method, options) {

        // Create the function
        const f = new lambda.Function(this, name, {
            runtime: lambda.Runtime.NODEJS_14_X,
            code: lambda.Code.fromAsset("lambda/dist"),
            handler: name + ".handler",
            vpc: options.vpc, 
            timeout: cdk.Duration.seconds(10),
            memorySize: 1536,
            environment: options.envVars,
            securityGroups: [options.lambdaSecurityGroup],
        })

        const methodOptions = {}
        if (options.auth) {
            methodOptions.authorizer = options.auth
            methodOptions.authorizationType = apigw.AuthorizationType.COGNITO
        }

        // Add the resource to the API
        const r = options.api.root.addResource(name)
        let resourceId
        switch (method) {
            case "any":
                r.addProxy({
                    defaultIntegration: new apigw.LambdaIntegration(f),
                    anyMethod: true,
                    defaultMethodOptions: methodOptions,
                })
                break
            case "delete": // e.g. DELETE /node/{id}
                resourceId = r.addResource("{id}")
                resourceId.addMethod("DELETE", new apigw.LambdaIntegration(f), methodOptions)
                break
            case "get": // e.g. GET /node/id
                resourceId = r.addResource("{id}")
                resourceId.addMethod("GET", new apigw.LambdaIntegration(f), methodOptions)
                break
            case "get-no-id": // special case for gets that don't have an id
                r.addMethod("get", new apigw.LambdaIntegration(f), methodOptions)
                break
            default:
                r.addMethod(method, new apigw.LambdaIntegration(f), methodOptions)
                break
        }

        // Allow the lambda function to access the Neptune cluster
        options.cluster.grantConnect(f)

        return f
    }
}

module.exports = NeptuneApiConstruct