const cdk = require("aws-cdk-lib")
const cognito = require("aws-cdk-lib/aws-cognito")

class CognitoStack extends cdk.Stack {
    /**
     * Create the user pools and app client.
     * 
     * @param {Construct} scope
     * @param {string} id
     * @param {cdk.StackProps=} props
     */
    constructor(scope, id, props) {
        super(scope, id, props)

        const domainPrefix = props.siteUrl.split(".").join("-").replace("https://", "")
        
        this.userPool = new cognito.UserPool(this, "knowledge-graph-pool", {})
        this.userPool.addDomain("CognitoDomain", {
            cognitoDomain: {
                domainPrefix,
            },
        })
        this.appClient = this.userPool.addClient("knowledge-graph-client", {
            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                },
                scopes: [cognito.OAuthScope.OPENID],
                callbackUrls: [props.siteUrl],
                logoutUrls: [props.siteUrl],
            },
        })

        new cdk.CfnOutput(this, "app-client-id-output", {
            value: this.appClient.userPoolClientId,
        })
    }

}

module.exports = CognitoStack


